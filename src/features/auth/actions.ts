"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/server/auth";
import { requireActor } from "@/server/auth/session";
import {
  actionError,
  actionOk,
  ConflictError,
  ValidationError,
  type ActionResult,
} from "@/server/errors";
import { clientFingerprint, enforceRateLimit } from "@/server/rate-limit";
import {
  changePasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
} from "@/validators/auth";

/**
 * Ações de conta.
 *
 * Todas revalidam a entrada no servidor, mesmo que o formulário já tenha
 * validado no navegador: a validação do cliente é conveniência de interface, e
 * um `fetch` direto contorna a interface inteira.
 */

export async function loginAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError(issue.message, String(issue.path[0] ?? ""));
    }

    // Dois limites com propósitos distintos.
    //
    // Por conta: é o que realmente barra força bruta contra uma senha.
    // Por origem: barra varredura de muitas contas a partir do mesmo lugar, com
    // folga generosa — em uma rede institucional (campus, laboratório, wi-fi
    // compartilhado) todo mundo sai pelo mesmo IP, e um limite apertado aqui
    // deixaria pessoas legítimas de fora.
    enforceRateLimit({
      action: "login:conta",
      subject: parsed.data.email,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    enforceRateLimit({
      action: "login:origem",
      subject: await clientFingerprint("login"),
      limit: 60,
      windowMs: 5 * 60 * 1000,
    });

    const callbackUrl = String(formData.get("callbackUrl") ?? "") || "/minha-conta";

    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    return actionOk({ redirectTo: safeRedirect(callbackUrl) });
  } catch (error) {
    if (error instanceof AuthError) {
      // Mensagem única: não revelamos se o e-mail existe.
      return {
        ok: false,
        code: "VALIDATION",
        error: "E-mail ou senha incorretos.",
      };
    }
    return actionError(error);
  }
}

export async function registerAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const parsed = registerSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      passwordConfirmation: formData.get("passwordConfirmation"),
      patronType: formData.get("patronType") || undefined,
      registrationId: formData.get("registrationId") ?? "",
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError(issue.message, String(issue.path[0] ?? ""));
    }

    enforceRateLimit({
      action: "register",
      subject: await clientFingerprint("register"),
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError(
        "Já existe uma conta com este e-mail.",
        "email",
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    // O papel NUNCA vem do formulário: toda conta criada publicamente é MEMBER.
    // Promoções acontecem apenas no painel administrativo.
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: "MEMBER",
        patronType: parsed.data.patronType ?? null,
        registrationId: parsed.data.registrationId,
      },
    });

    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    const callbackUrl = String(formData.get("callbackUrl") ?? "") || "/minha-conta";
    return actionOk({ redirectTo: safeRedirect(callbackUrl) });
  } catch (error) {
    return actionError(error);
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function updateProfileAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const actor = await requireActor();

    const parsed = profileSchema.safeParse({
      name: formData.get("name"),
      phone: formData.get("phone") ?? "",
      registrationId: formData.get("registrationId") ?? "",
      patronType: formData.get("patronType") || null,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError(issue.message, String(issue.path[0] ?? ""));
    }

    // `where: { id: actor.id }` — o usuário só pode editar o próprio perfil,
    // independentemente do que venha no formulário.
    await prisma.user.update({
      where: { id: actor.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        registrationId: parsed.data.registrationId,
        patronType: parsed.data.patronType ?? null,
      },
    });

    revalidatePath("/minha-conta");
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

export async function changePasswordAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const actor = await requireActor();

    const parsed = changePasswordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      password: formData.get("password"),
      passwordConfirmation: formData.get("passwordConfirmation"),
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError(issue.message, String(issue.path[0] ?? ""));
    }

    enforceRateLimit({
      action: "change-password",
      subject: actor.id,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      throw new ValidationError(
        "Esta conta não usa senha. Entre em contato com a equipe do NEABI.",
      );
    }

    const valid = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash,
    );
    if (!valid) {
      throw new ValidationError("Senha atual incorreta.", "currentPassword");
    }

    await prisma.user.update({
      where: { id: actor.id },
      data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) },
    });

    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

/**
 * Impede redirecionamento aberto: só aceitamos caminhos internos.
 * Um `callbackUrl` apontando para outro domínio é descartado.
 */
function safeRedirect(target: string): string {
  if (!target.startsWith("/") || target.startsWith("//")) return "/minha-conta";
  return target;
}
