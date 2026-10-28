"use client";
import { useEffect, useState } from "react";
import { CREAM_BUTTON } from "../components/LeagueUI";
type Post = { id: string; name: string; text: string; date: string };
const STORAGE_KEY = "cpp-243916-media-discussion-v1";
function validPost(value: unknown): value is Post {
  if (!value || typeof value !== "object") return false;
  const post = value as Post;
  return (
    typeof post.id === "string" &&
    typeof post.name === "string" &&
    post.name.length <= 60 &&
    typeof post.text === "string" &&
    post.text.length <= 1000 &&
    typeof post.date === "string" &&
    Number.isFinite(Date.parse(post.date))
  );
}
export default function DiscussionBoard() {
  const [posts, setPosts] = useState<Post[]>([]),
    [name, setName] = useState(""),
    [text, setText] = useState(""),
    [loaded, setLoaded] = useState(false),
    [warning, setWarning] = useState("");
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(stored))
        setPosts(stored.filter(validPost).slice(0, 100));
    } catch {
      setWarning("Saved posts could not be read on this device.");
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    } catch {
      setWarning(
        "Browser storage is unavailable; posts will last only while this page is open.",
      );
    }
  }, [loaded, posts]);
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setPosts((previous) =>
      [
        {
          id: crypto.randomUUID(),
          name: name.trim() || "Anonymous",
          text: text.trim(),
          date: new Date().toISOString(),
        },
        ...previous,
      ].slice(0, 100),
    );
    setText("");
  }
  return (
    <section className="mt-10 rounded-2xl border border-gray-800 bg-black/20 p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Discussion Board 💬</h2>
        <button
          onClick={() => {
            if (window.confirm("Clear discussion posts saved on this device?"))
              setPosts([]);
          }}
          disabled={!posts.length}
          className="text-xs text-gray-400 underline hover:text-white disabled:opacity-40"
        >
          Clear (this device)
        </button>
      </div>
      <p className="mb-4 text-xs text-gray-400">
        Posts are saved on this device and are not shared with other league
        members.
      </p>
      <form onSubmit={submit} className="mb-5 flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Name (optional)</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            placeholder="Name (optional)"
            className="w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2"
          />
        </label>
        <label className="flex-[2]">
          <span className="sr-only">Discussion message</span>
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={1000}
            required
            placeholder="Say something…"
            className="w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2"
          />
        </label>
        <button
          className={CREAM_BUTTON + " disabled:opacity-40"}
          disabled={!loaded || !text.trim()}
        >
          Post
        </button>
      </form>
      {warning && (
        <p role="alert" className="mb-3 text-sm text-amber-300">
          {warning}
        </p>
      )}
      {!loaded ? (
        <p role="status" className="text-center text-gray-400">
          Loading saved posts…
        </p>
      ) : !posts.length ? (
        <p className="text-center text-gray-400">No posts yet. Be the first!</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li
              key={post.id}
              className="rounded-xl border border-gray-800 bg-black/30 p-3"
            >
              <time dateTime={post.date} className="text-xs text-gray-400">
                {new Intl.DateTimeFormat("en-US", {
                  timeZone: "America/New_York",
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(post.date))}
              </time>
              <div className="mt-1 font-semibold">{post.name}</div>
              <p className="mt-1 whitespace-pre-wrap break-words">
                {post.text}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
