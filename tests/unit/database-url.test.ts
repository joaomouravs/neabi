import { describe, expect, it } from "vitest";

import { withVerifiedSsl } from "@/lib/database-url";

describe("conexão com o banco", () => {
  it("explicita a verificação do certificado quando o provedor pede SSL", () => {
    const url = withVerifiedSsl(
      "postgresql://u:p@ep-exemplo.neon.tech/neondb?sslmode=require&channel_binding=require",
    );
    const params = new URL(url).searchParams;
    expect(params.get("sslmode")).toBe("verify-full");
    expect(params.get("channel_binding")).toBe("require");
  });

  it("não mexe em conexão sem SSL nem em modo já estrito", () => {
    const local = "postgresql://postgres:postgres@127.0.0.1:54329/neabi";
    expect(withVerifiedSsl(local)).toBe(local);
    const estrito = "postgresql://u:p@host/db?sslmode=verify-full";
    expect(withVerifiedSsl(estrito)).toBe(estrito);
  });

  it("não corrompe uma string que não é URL", () => {
    expect(withVerifiedSsl("host=localhost dbname=neabi")).toBe("host=localhost dbname=neabi");
  });
});
