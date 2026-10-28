"use client";
import { useState } from "react";
import {
  CONTACT_TOPICS,
  CONTACT_PRIORITIES,
} from "../../../lib/contact-fields";
import { CREAM_BUTTON } from "../components/LeagueUI";
const INPUT =
  "w-full rounded-xl border border-gray-800 bg-black/40 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-purple-500";
export default function ContactForm({
  email,
  hasEndpoint,
}: {
  email: string;
  hasEndpoint: boolean;
}) {
  const [status, setStatus] = useState(""),
    [sending, setSending] = useState(false),
    [length, setLength] = useState(0);
  const enabled = hasEndpoint || Boolean(email);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || sending) return;
    const form = event.currentTarget,
      data = new FormData(form);
    setStatus("");
    const message = {
      name: String(data.get("name") || ""),
      email: String(data.get("email") || ""),
      subject: String(data.get("subject") || ""),
      topic: String(data.get("topic") || ""),
      priority: String(data.get("priority") || ""),
      message: String(data.get("message") || ""),
      company: String(data.get("company") || ""),
      consent: data.get("consent") === "on",
    };
    if (!hasEndpoint) {
      const body = `Name: ${message.name}\nEmail: ${message.email}\nLeague: CPP Fantasy Football\nTopic: ${message.topic}\nPriority: ${message.priority}\n\n${message.message}`;
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(body)}`;
      setStatus(
        "Your email draft is ready in your mail app. Review it and send it there.",
      );
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to send your message.");
      setStatus("Your message has been sent!");
      form.reset();
      setLength(0);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to send your message.",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <section className="mb-10 rounded-2xl border border-gray-800 bg-black/20 p-5">
      <h2 className="mb-6 text-center text-2xl font-bold">Send a Message</h2>
      {!enabled && (
        <p className="mb-5 rounded-xl border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-200">
          Email and form delivery are being configured for CPP. Use the league’s
          ESPN message board in the meantime.
        </p>
      )}
      {enabled && !hasEndpoint && (
        <p className="mb-5 text-center text-sm text-gray-400">
          This form prepares an email to the commissioner. Review it and send it
          in your mail app.
        </p>
      )}
      <form onSubmit={submit} className="space-y-6">
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-gray-300">
            Name
            <input
              name="name"
              autoComplete="name"
              maxLength={80}
              required
              placeholder="Your name"
              className={INPUT + " mt-1"}
            />
          </label>
          <label className="block text-sm text-gray-300">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              placeholder="you@example.com"
              className={INPUT + " mt-1"}
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-gray-300">
            Topic
            <select name="topic" className={INPUT + " mt-1"}>
              {CONTACT_TOPICS.map((topic) => (
                <option key={topic}>{topic}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-gray-300">
            Priority
            <select name="priority" className={INPUT + " mt-1"}>
              {CONTACT_PRIORITIES.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm text-gray-300">
          Subject
          <input
            name="subject"
            maxLength={120}
            required
            placeholder="Quick summary…"
            className={INPUT + " mt-1"}
          />
        </label>
        <div className="text-sm text-gray-300">
          <label htmlFor="contact-message" className="block">
            Message
          </label>
          <textarea
            id="contact-message"
            name="message"
            aria-describedby="contact-message-count"
            required
            rows={6}
            maxLength={1000}
            onChange={(event) => setLength(event.target.value.length)}
            placeholder="What’s up? Include your team name and any useful details."
            className={INPUT + " mt-1"}
          />
          <span
            id="contact-message-count"
            className="mt-1 block text-right text-xs text-gray-400"
          >
            {1000 - length} characters left
          </span>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            name="consent"
            type="checkbox"
            required
            className="h-4 w-4 rounded border-gray-700 bg-black/40"
          />
          I consent to this message being used for CPP league administration.
        </label>
        <button
          className={
            CREAM_BUTTON +
            " w-full disabled:cursor-not-allowed disabled:opacity-40"
          }
          disabled={!enabled || sending}
        >
          {sending
            ? "Sending…"
            : hasEndpoint
              ? "Send Message"
              : email
                ? "Open Message in Email App"
                : "Send Message"}
        </button>
        {status && (
          <p
            role="status"
            aria-live="polite"
            className="text-center text-sm text-gray-300"
          >
            {status}
          </p>
        )}
      </form>
    </section>
  );
}
