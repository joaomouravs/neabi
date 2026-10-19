/**
 * Torna explícita a verificação do certificado do banco.
 *
 * O `pg` atual trata `sslmode=require` (o que a Neon publica) como
 * `verify-full`; na próxima versão maior, `require` passará a cifrar sem
 * conferir o certificado. Gravar `verify-full` mantém o comportamento de hoje
 * e impede que uma atualização de dependência o enfraqueça em silêncio.
 * Conexões sem `sslmode` (o banco local) ficam como estão.
 */
export function withVerifiedSsl(connectionString: string): string {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return connectionString;
  }
  const mode = url.searchParams.get("sslmode");
  if (mode && ["prefer", "require", "verify-ca"].includes(mode)) {
    url.searchParams.set("sslmode", "verify-full");
    return url.toString();
  }
  return connectionString;
}
