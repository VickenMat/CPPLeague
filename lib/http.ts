export class HttpError extends Error {
  status: number;
  body?: string;

  constructor(message: string, status: number, body?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

function trimBody(body: string) {
  return body.replace(/\s+/g, " ").trim().slice(0, 300);
}

export async function readResponseMessage(res: Response) {
  const text = await res.text().catch(() => "");
  if (!text) return res.statusText || "Request failed";

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.error === "string" && parsed.error) return parsed.error;
    if (typeof parsed?.message === "string" && parsed.message)
      return parsed.message;
  } catch {
    // Non-JSON body.
  }

  return trimBody(text) || res.statusText || "Request failed";
}

export async function fetchJson<T>(
  input: string | URL | Request,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 12000, ...requestInit } = init;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const signal = requestInit.signal
    ? AbortSignal.any([requestInit.signal, controller.signal])
    : controller.signal;

  try {
    const res = await fetch(input, {
      ...requestInit,
      cache: requestInit.cache ?? "no-store",
      redirect: "error",
      signal,
    });

    if (!res.ok) {
      const message = await readResponseMessage(res);
      throw new HttpError(message, res.status, message);
    }

    const text = await res.text();
    if (!text) {
      throw new Error("Empty response body");
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error("Invalid JSON response");
    }
  } catch (error) {
    if (controller.signal.aborted && !requestInit.signal?.aborted) {
      throw new Error("Request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function toErrorMessage(error: unknown, fallback = "Unexpected error") {
  if (error instanceof HttpError) {
    return `${error.message} [${error.status}]`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
