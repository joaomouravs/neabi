import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/validators/auth";

/**
 * Configuração do Auth.js.
 *
 * Estratégia de sessão: JWT. O provedor de credenciais não é compatível com
 * sessões de banco, e o adapter Prisma segue configurado para que provedores
 * OAuth institucionais possam ser adicionados depois sem migração de dados.
 *
 * O papel (`role`) é gravado no token na autenticação e revalidado a cada
 * atualização de sessão: uma promoção ou rebaixamento tem efeito sem exigir
 * novo login, e uma conta desativada perde acesso imediatamente.
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

        if (!user || !user.passwordHash || !user.active || !valid) return null;

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
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: Role }).role ?? Role.MEMBER;
        return token;
      }

      if (trigger === "update" || !token.role) {
        const current = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, active: true, name: true },
        });
        if (!current || !current.active) return null;
        token.role = current.role;
        token.name = current.name;
      }

      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      session.user.role = (token.role as Role | undefined) ?? Role.MEMBER;
      return session;
    },
  },
};
