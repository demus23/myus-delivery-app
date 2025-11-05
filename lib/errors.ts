// lib/errors.ts
export function getErrorInfo(err: unknown): { message: string; code?: string } {
  if (err instanceof Error) {
    const anyErr = err as unknown as { code?: unknown; raw?: { code?: unknown } };
    const code =
      (typeof anyErr.code === "string" && anyErr.code) ||
      (anyErr.raw && typeof anyErr.raw.code === "string" ? anyErr.raw.code : undefined);
    return { message: err.message, code };
  }
  if (typeof err === "string") return { message: err };
  if (err && typeof err === "object") {
    const obj = err as { message?: unknown; code?: unknown; raw?: { code?: unknown } };
    const message =
      typeof obj.message === "string" ? obj.message : JSON.stringify(err);
    const code =
      (typeof obj.code === "string" && obj.code) ||
      (obj.raw && typeof obj.raw.code === "string" ? obj.raw.code : undefined);
    return { message, code };
  }
  return { message: String(err) };
}
