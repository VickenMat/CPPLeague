import { InputError } from "./validation";
export const CONTACT_TOPICS = [
  "General",
  "Rules",
  "Website bug",
  "Trade dispute",
  "Media/Press",
] as const;
export const CONTACT_PRIORITIES = ["Normal", "Low", "High"] as const;
export function validateContactMessage(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Invalid message.");
  const input = value as Record<string, unknown>;
  const field = (name: string, max: number) => {
    const raw = input[name];
    if (typeof raw !== "string" || !raw.trim() || raw.length > max)
      throw new InputError(`Please provide a valid ${name}.`);
    return raw.trim();
  };
  const name = field("name", 80),
    email = field("email", 254),
    subject = field("subject", 120),
    message = field("message", 1000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new InputError("Please provide a valid email.");
  if (
    !CONTACT_TOPICS.includes(input.topic as (typeof CONTACT_TOPICS)[number]) ||
    !CONTACT_PRIORITIES.includes(
      input.priority as (typeof CONTACT_PRIORITIES)[number],
    )
  )
    throw new InputError("Choose a valid topic and priority.");
  if (input.consent !== true)
    throw new InputError(
      "Please consent to using this message for league administration.",
    );
  return {
    name,
    email,
    subject,
    message,
    topic: String(input.topic),
    priority: String(input.priority),
    league: "CPP Fantasy Football",
  };
}
