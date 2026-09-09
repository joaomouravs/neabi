import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Limpa dados transacionais do banco de desenvolvimento.
 *
 * Remove reservas, histórico, visualizações e buscas, e devolve todos os
 * exemplares ao acervo — sem tocar no catálogo, nas contas ou nas
 * configurações. Útil antes de rodar a suíte de ponta a ponta.
 *
 *   npm run db:reset-dados
 */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não definida.");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const [history, reservations, views, searches] = await prisma.$transaction([
    prisma.reservationHistory.deleteMany({}),
    prisma.reservation.deleteMany({}),
    prisma.bookView.deleteMany({}),
    prisma.searchEvent.deleteMany({}),
  ]);

  const copies = await prisma.physicalCopy.updateMany({
    where: { status: { in: ["RESERVED", "IN_USE"] } },
    data: { status: "AVAILABLE" },
  });

  await prisma.book.updateMany({ data: { viewCount: 0 } });

  console.info(
    `Removidos: ${reservations.count} reserva(s), ${history.count} registro(s) de histórico, ` +
      `${views.count} visualização(ões), ${searches.count} busca(s).`,
  );
  console.info(`Exemplares devolvidos ao acervo: ${copies.count}.`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Falha ao limpar os dados:", error);
  process.exitCode = 1;
});
