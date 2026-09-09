import "dotenv/config";

import { prisma } from "@/lib/prisma";

async function main() {
  const linhas: string[] = [];
  const ok = (t: string) => linhas.push(`  ok   ${t}`);

  // Conexão + versão real do motor.
  const versao = await prisma.$queryRaw<
    { version: string }[]
  >`SELECT version() as version`;
  ok(`conexão: ${versao[0].version.split(",")[0]}`);

  // Migrations registradas.
  const migracoes = await prisma.$queryRaw<
    { migration_name: string; finished_at: Date | null }[]
  >`SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at`;
  ok(
    `migrations aplicadas: ${migracoes
      .map((m) => `${m.migration_name}${m.finished_at ? "" : " (PENDENTE)"}`)
      .join(", ")}`,
  );

  // Leitura.
  const [obras, exemplares, categorias, usuarios] = await Promise.all([
    prisma.book.count(),
    prisma.physicalCopy.count(),
    prisma.category.count(),
    prisma.user.count(),
  ]);
  ok(
    `leitura: ${obras} obras, ${exemplares} exemplares, ${categorias} categorias, ${usuarios} contas`,
  );

  // Escrita, atualização e exclusão.
  const criada = await prisma.category.create({
    data: { slug: "_verificacao-temporaria", name: "Verificação" },
    select: { id: true },
  });
  ok("escrita: categoria criada");

  await prisma.category.update({
    where: { id: criada.id },
    data: { name: "Verificação (atualizada)" },
  });
  const atualizada = await prisma.category.findUniqueOrThrow({
    where: { id: criada.id },
    select: { name: true },
  });
  ok(`atualização: nome = "${atualizada.name}"`);

  await prisma.category.delete({ where: { id: criada.id } });
  ok("exclusão: categoria removida");

  // Transação com rollback: nada pode sobrar após a falha.
  const slugTx = "_verificacao-rollback";
  await prisma
    .$transaction(async (tx) => {
      await tx.category.create({ data: { slug: slugTx, name: "Rollback" } });
      throw new Error("falha proposital");
    })
    .catch(() => undefined);

  const sobrou = await prisma.category.findUnique({ where: { slug: slugTx } });
  if (sobrou) throw new Error("ROLLBACK FALHOU: registro persistiu após erro");
  ok("transação: rollback desfez a escrita parcial");

  // Índices de busca.
  const indices = await prisma.$queryRaw<{ indexname: string }[]>`
    SELECT indexname FROM pg_indexes
    WHERE tablename IN ('Book', 'Person') AND indexname LIKE '%trgm%'
  `;
  ok(
    indices.length > 0
      ? `índices trigram: ${indices.map((i) => i.indexname).join(", ")}`
      : "índices trigram: ausentes (busca funciona sem eles)",
  );

  // Busca sem acento contra o banco real.
  const encontrados = await prisma.book.count({
    where: { searchText: { contains: "etnico" } },
  });
  ok(`busca sem acento: "etnico" encontra ${encontrados} obra(s)`);

  console.info("\nVerificação do PostgreSQL\n" + linhas.join("\n") + "\n");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
