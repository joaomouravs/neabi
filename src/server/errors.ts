/**
 * Erros de domínio.
 *
 * Serviços lançam estes erros; a camada de ação traduz para o formato que a
 * interface entende. Mensagens são escritas para a pessoa usuária — nunca
 * expõem detalhes internos, identificadores ou estado do banco.
 */

export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly field?: string;

  constructor(code: AppErrorCode, message: string, field?: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.field = field;
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "É necessário entrar na sua conta para continuar.") {
    super("UNAUTHENTICATED", message);
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Você não tem permissão para realizar esta ação.") {
    super("FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Registro não encontrado.") {
    super("NOT_FOUND", message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super("VALIDATION", message, field);
    this.name = "ValidationError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, field?: string) {
    super("CONFLICT", message, field);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Muitas tentativas. Aguarde alguns instantes.") {
    super("RATE_LIMITED", message);
    this.name = "RateLimitError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Resultado padronizado devolvido pelas Server Actions. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: AppErrorCode; field?: string };

export function actionOk(): ActionResult<undefined>;
export function actionOk<T>(data: T): ActionResult<T>;
export function actionOk<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function actionError(error: unknown): ActionResult<never> {
  if (isAppError(error)) {
    return {
      ok: false,
      error: error.message,
      code: error.code,
      field: error.field,
    };
  }

  // Erros inesperados nunca vazam detalhes para a interface.
  console.error("[action] erro não tratado:", error);
  return {
    ok: false,
    error: "Não foi possível concluir a operação. Tente novamente.",
    code: "INTERNAL",
  };
}
