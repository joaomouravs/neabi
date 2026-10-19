import { afterEach, describe, expect, it, vi } from "vitest";

import {
  HOSTED_UPLOAD_LIMIT_BYTES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  uploadLimits,
} from "@/server/storage";

/**
 * Na Vercel, requisição e resposta de função param em 4,5 MB. O limite do
 * produto não pode prometer mais do que a hospedagem entrega.
 */
describe("limites de upload", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fora da Vercel, valem os limites do produto", () => {
    vi.stubEnv("VERCEL", "");
    expect(uploadLimits()).toEqual({ image: MAX_IMAGE_BYTES, document: MAX_DOCUMENT_BYTES });
  });

  it("na Vercel, nenhum limite passa do teto da plataforma", () => {
    vi.stubEnv("VERCEL", "1");
    const limits = uploadLimits();
    expect(limits.image).toBe(HOSTED_UPLOAD_LIMIT_BYTES);
    expect(limits.document).toBe(HOSTED_UPLOAD_LIMIT_BYTES);
    expect(HOSTED_UPLOAD_LIMIT_BYTES).toBeLessThan(4.5 * 1000 * 1000);
  });
});
