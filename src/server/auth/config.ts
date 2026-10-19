import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { audit } from "@/server/logger";
import { checkRateLimit } from "@/server/rate-limit";
import { loginSchema } from "@/validators/auth";

/**
 * Limite de tentativas por conta.
 *
 * Exportado porque o formulário de login consulta a mesma janela (sem
 * consumi-la) apenas para dar uma mensagem melhor: os dois pontos precisam
 * concordar sobre qual janela é essa.
 */
export const LOGIN_ACCOUNT_SCOPE = "login:conta";
export const LOGIN_ACCOUNT_LIMIT = 8;
export const LOGIN_ACCOUNT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Configuração do Auth.js.
 *
 * Estratégia de sessão: JWT. O provedor de credenciais não é compatível com
 * sessões de banco, e o adapter Prisma segue configurado para que provedores
 * OAuth institucionais possam ser adicionados depois sem migração de dados.
 *
 * O papel (`role`) é gravado no token na autenticação e conferido no banco a
 * cada leitura da sessão: uma promoção ou rebaixamento tem efeito sem exigir
 * novo login, e uma conta desativada perde acesso imediatamente. O token vale
 * sete dias — sem essa conferência, uma pessoa administradora rebaixada ou uma
 * conta desativada seguiriam com o acesso antigo até o token expirar.
 */
export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "E-mail e senha",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // A limitação de taxa mora AQUI, e não apenas na Server Action do
        // formulário: `POST /api/auth/callback/credentials` é uma rota pública
        // do Auth.js e chega até este ponto sem passar por aquela ação. Um
        // limite implementado só na ação protegeria a tela, não a conta.
        const bloqueio = checkRateLimit({
          action: LOGIN_ACCOUNT_SCOPE,
          subject: parsed.data.email,
          limit: LOGIN_ACCOUNT_LIMIT,
          windowMs: LOGIN_ACCOUNT_WINDOW_MS,
        });
        if (!bloqueio.allowed) {
          audit("login.bloqueado", {
            motivo: "limite_por_conta",
            retryAfterMs: bloqueio.retryAfterMs,
          });
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            active: true,
            passwordHash: true,
          },
        });

        // Comparação executada mesmo sem usuário para manter o tempo de
        // resposta estável e não revelar quais e-mails existem.
        const hash =
          user?.passwordHash ??
          "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidix";
        const valid = await bcrypt.compare(parsed.data.password, hash);

        if (!user || !user.passwordHash || !user.active || !valid) {
          // Sem e-mail no log: o registro serve para detectar ataque, não para
          // reconstruir quem tentou entrar em qual conta.
          audit("login.falha", {
            motivo: !user
              ? "conta_inexistente"
              : !user.active
                ? "conta_desativada"
                : "senha_invalida",
          });
          return null;
        }

        audit("login.sucesso", { userId: user.id, role: user.role });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: Role }).role ?? Role.MEMBER;
        return token;
      }

      // Toda leitura da sessão, e não só `trigger === "update"`: nada no
      // sistema dispara essa atualização, então a conferência condicional
      // nunca acontecia. É uma consulta por chave primária, e `getActor`
      // deduplica as leituras de uma mesma requisição.
      if (!token.id) return null;
      const current = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { role: true, active: true, name: true },
      });
      if (!current || !current.active) return null;
      token.role = current.role;
      token.name = current.name;

      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      session.user.role = (token.role as Role | undefined) ?? Role.MEMBER;
      return session;
    },
  },
};
