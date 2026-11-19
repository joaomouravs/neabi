/**
 * Decide se a Netlify deve construir este commit — o comando `ignore` do
 * `netlify.toml`. Saída 0 cancela o build; saída 1 segue com ele.
 *
 * No plano gratuito cada deploy de produção custa 15 dos 300 créditos do mês,
 * e um push por dia na `main` esgotaria a cota sozinho. Por isso a produção só
 * é publicada quando a mensagem do commit pede, com `[publicar]`:
 *
 *   git commit -m "Ajusta o horário de atendimento [publicar]"
 *
 * Mesmo com o pedido, um commit que só mexe em documentação ou testes não
 * gera deploy. Deploy preview e branch deploy não são cobrados e sempre
 * constroem — servem para conferir antes de publicar.
 *
 * O `ignore` vale também para "Trigger deploy" no painel, que compara o último
 * commit. Para publicar sem mudança de código, use um commit vazio:
 *
 *   git commit --allow-empty -m "Republica [publicar]"
 *
 * (Um commit vazio não muda arquivos, então passa direto pela checagem de
 * documentação abaixo.)
 */
import { execSync } from "node:child_process";

const contexto = process.env.CONTEXT ?? "";
if (contexto !== "production") {
  console.log(`[ignorar-build] contexto "${contexto}": build gratuito, segue.`);
  process.exit(1);
}

const run = (command) => execSync(command, { encoding: "utf8" }).trim();

let mensagens = "";
let arquivos = [];
try {
  const anterior = process.env.CACHED_COMMIT_REF;
  const atual = process.env.COMMIT_REF ?? "HEAD";
  const intervalo = anterior && anterior !== atual ? `${anterior}..${atual}` : `${atual}~1..${atual}`;
  mensagens = run(`git log --format=%B ${intervalo}`);
  arquivos = run(`git diff --name-only ${intervalo}`).split("\n").filter(Boolean);
} catch {
  // Sem histórico para comparar (primeiro build do site): publica.
  console.log("[ignorar-build] sem commit anterior para comparar: segue.");
  process.exit(1);
}

if (!/\[publicar\]/i.test(mensagens)) {
  console.log("[ignorar-build] nenhum commit pede [publicar]: produção não é reconstruída.");
  process.exit(0);
}

const soDocumentacao = arquivos.length > 0 && arquivos.every((arquivo) =>
  /^(docs\/|tests\/|\.github\/|README\.md$|LICENSE$|\.gitignore$|[^/]+\.md$)/.test(arquivo),
);
if (soDocumentacao) {
  console.log("[ignorar-build] só documentação e testes mudaram: produção não é reconstruída.");
  process.exit(0);
}

console.log(`[ignorar-build] [publicar] com ${arquivos.length} arquivo(s) de código: segue.`);
process.exit(1);
