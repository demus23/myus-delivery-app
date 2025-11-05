// utils/errorInfo.ts
export type ErrorInfo = { message: string; code?: string };

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function getErrorInfo(err: unknown): ErrorInfo {
  // Plain Error
  if (err instanceof Error) return { message: err.message };

  // Common shapes (Stripe, Axios, generic libs)
  if (isObj(err)) {
    // message
    let message =
      (typeof err.message === "string" && err.message) ||
      (isObj(err.raw) && typeof err.raw.message === "string" && err.raw.message) ||
      (isObj(err.response) &&
        isObj(err.response.data) &&
        typeof (err.response.data as any).error === "string" &&
        (err.response.data as any).error) ||
      "Unknown error";

    // code
    let code: string | undefined =
      (typeof err.code === "string" && err.code) ||
      (isObj(err.raw) && typeof err.raw.code === "string" && err.raw.code) ||
      undefined;

    return { message, code };
  }

  // String or anything else
  if (typeof err === "string") return { message: err };
  try {
    return { message: JSON.stringify(err) };
  } catch {
    return { message: "Unknown error" };
  }
}
