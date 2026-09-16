import { z } from "zod";

/**
 * Variáveis de ambiente — fonte única de verdade.
 *
 * Motivo de existir: `process.env.X` espalhado pelo código falha tarde e falha
 * mal. Uma variável ausente vira `undefined`, atravessa três camadas e só
 * aparece como um erro incompreensível em produção — ou, pior, como um
 * comportamento silenciosamente errado (armazenamento sem bucket, e-mail que
 * nunca sai). Aqui a configuração é validada uma vez, com mensagens que dizem o
 * que fazer.
 *
 * Regra de dependência condicional: uma variável só é obrigatória quando o
 * driver que a consome está ativo. `STORAGE_DRIVER="local"` não exige bucket S3;
 * `MAIL_DRIVER="console"` não exige servidor SMTP.
 */

const nonEmpty = (mensagem: string) => z.string().trim().min(1, mensagem);

const baseSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // ---------------------------------------------------------------------------
  // Banco de dados
  // ---------------------------------------------------------------------------
  DATABASE_URL: nonEmpty(
    "DATABASE_URL é obrigatória. Copie .env.example para .env e configure a conexão PostgreSQL.",
  ).refine(
    (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
    "DATABASE_URL precisa ser uma conexão PostgreSQL (postgresql://…). Este projeto não usa SQLite.",
  ),
  /**
   * Conexão direta, sem pooler. Provedores gerenciados (Neon, Supabase) expõem
   * um pooler que não suporta as instruções DDL das migrações; `prisma migrate`
   * usa esta URL quando ela existe. Em desenvolvimento não é necessária.
   */
  DIRECT_URL: z.string().trim().optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().optional(),

  // ---------------------------------------------------------------------------
  // Autenticação
  // ---------------------------------------------------------------------------
  AUTH_SECRET: nonEmpty(
    "AUTH_SECRET é obrigatória. Gere uma com: openssl rand -base64 48",
  ).refine(
    (value) => value.length >= 32,
    "AUTH_SECRET é curta demais (mínimo 32 caracteres). Gere uma com: openssl rand -base64 48",
  ),
  AUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),

  // ---------------------------------------------------------------------------
  // Aplicação
  // ---------------------------------------------------------------------------
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),

  // ---------------------------------------------------------------------------
  // Armazenamento
  // ---------------------------------------------------------------------------
  STORAGE_DRIVER: z.enum(["local", "s3", "blob"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().trim().default("storage/uploads"),
  NEXT_PUBLIC_STORAGE_BASE_URL: z.string().trim().default("/api/arquivos"),

  S3_ENDPOINT: z.string().trim().optional(),
  S3_REGION: z.string().trim().optional(),
  S3_BUCKET: z.string().trim().optional(),
  S3_ACCESS_KEY_ID: z.string().trim().optional(),
  S3_SECRET_ACCESS_KEY: z.string().trim().optional(),
  S3_PUBLIC_BASE_URL: z.string().trim().optional(),

  /** Injetada pela Vercel ao vincular uma store do Blob ao projeto. */
  BLOB_READ_WRITE_TOKEN: z.string().trim().optional(),

  // ---------------------------------------------------------------------------
  // E-mail
  // ---------------------------------------------------------------------------
  MAIL_DRIVER: z.enum(["console", "smtp"]).default("console"),
  MAIL_FROM: z
    .string()
    .trim()
    .default("Biblioteca NEABI-NI <nao-responda@localhost>"),
  SMTP_HOST: z.string().trim().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().trim().optional(),
  SMTP_PASSWORD: z.string().trim().optional(),

  // ---------------------------------------------------------------------------
  // Observabilidade e proteção
  // ---------------------------------------------------------------------------
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "silent"]).optional(),
  RATE_LIMIT_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  /**
   * Segredo do endpoint de manutenção (expiração de reservas vencidas). Sem
   * ele, a rota responde 503 em vez de ficar aberta — negar é mais seguro que
   * executar rotina de escrita sem autenticação.
   */
  CRON_SECRET: z.string().trim().optional(),
});

const schema = baseSchema.superRefine((value, ctx) => {
  if (value.STORAGE_DRIVER === "s3" && !value.S3_BUCKET) {
    ctx.addIssue({
      code: "custom",
      path: ["S3_BUCKET"],
      message:
        'STORAGE_DRIVER="s3" exige S3_BUCKET (e as credenciais do provedor).',
    });
  }

  if (value.STORAGE_DRIVER === "blob" && !value.BLOB_READ_WRITE_TOKEN) {
    ctx.addIssue({
      code: "custom",
      path: ["BLOB_READ_WRITE_TOKEN"],
      message:
        'STORAGE_DRIVER="blob" exige BLOB_READ_WRITE_TOKEN. Crie a store com: vercel blob create-store <nome> --access private',
    });
  }

  if (value.MAIL_DRIVER === "smtp" && !value.SMTP_HOST) {
    ctx.addIssue({
      code: "custom",
      path: ["SMTP_HOST"],
      message: 'MAIL_DRIVER="smtp" exige SMTP_HOST.',
    });
  }

  // Em produção, um segredo de desenvolvimento é pior do que nenhum: dá falsa
  // sensação de proteção a sessões reais.
  if (
    value.NODE_ENV === "production" &&
    /dev|local|troca|change|exemplo|example|secret|senha/i.test(value.AUTH_SECRET)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["AUTH_SECRET"],
      message:
        "AUTH_SECRET parece ser um valor de desenvolvimento. Gere um segredo próprio para produção: openssl rand -base64 48",
    });
  }
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    const detalhes = result.error.issues
      .map((issue) => `  • ${issue.path.join(".") || "(raiz)"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Configuração de ambiente inválida:\n${detalhes}\n\nConsulte .env.example.`,
    );
  }

  return result.data;
}

/**
 * Carregado sob demanda e memoizado.
 *
 * O acesso preguiçoso importa: alguns módulos são importados por ferramentas
 * (geração de tipos, análise estática) em contextos onde o `.env` do
 * desenvolvedor não está carregado. Falhar só no primeiro uso real mantém essas
 * ferramentas funcionando sem afrouxar a validação em tempo de execução.
 */
let cached: Env | null = null;

export function env(): Env {
  cached ??= load();
  return cached;
}

/** Só para testes: força nova leitura de `process.env`. */
export function resetEnvCache(): void {
  cached = null;
}
