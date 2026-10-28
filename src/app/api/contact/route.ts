import { NextResponse } from "next/server";
import { getContactConfig } from "../../../../lib/contact-config";
import { validateContactMessage } from "../../../../lib/contact-fields";
import { InputError } from "../../../../lib/validation";
import { checkRateLimit } from "../../../../lib/rate-limit";
export async function POST(req: Request) {
  const limited = checkRateLimit(req, "contact", 5, 60_000);
  if (limited) return limited;
  try {
    let sameOrigin = false;
    try {
      const origin = new URL(req.headers.get("origin") || "");
      sameOrigin =
        ["http:", "https:"].includes(origin.protocol) &&
        origin.host === new URL(req.url).host;
    } catch {
      /* Invalid origins are rejected. */
    }
    if (!sameOrigin)
      return NextResponse.json(
        { error: "Please send this message from the CPP website." },
        { status: 403 },
      );
    const { endpoint } = getContactConfig();
    if (!endpoint)
      return NextResponse.json(
        {
          error:
            "Message delivery has not been configured. Please contact the commissioner on ESPN.",
        },
        { status: 503 },
      );
    if (!req.headers.get("content-type")?.startsWith("application/json"))
      return NextResponse.json(
        { error: "Invalid message format." },
        { status: 415 },
      );
    const reader = req.body?.getReader();
    if (!reader) throw new InputError("Missing message.");
    const decoder = new TextDecoder();
    let body = "",
      bytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 8192) {
        await reader.cancel();
        return NextResponse.json(
          { error: "Message is too long." },
          { status: 413 },
        );
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    let input: unknown;
    try {
      input = JSON.parse(body);
    } catch {
      throw new InputError("Invalid message.");
    }
    if (
      input &&
      typeof input === "object" &&
      "company" in input &&
      (input as { company: unknown }).company
    )
      return NextResponse.json({ ok: true });
    const message = validateContactMessage(input);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      return NextResponse.json(
        { error: "The message could not be delivered. Please try again." },
        { status: 502 },
      );
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof InputError
            ? error.message
            : "The message could not be delivered. Please try again.",
      },
      { status: error instanceof InputError ? 400 : 502 },
    );
  }
}
