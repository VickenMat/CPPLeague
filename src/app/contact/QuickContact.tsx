"use client";
import { useState } from "react";
import { CREAM_BUTTON } from "../components/LeagueUI";
export default function QuickContact({ email }: { email: string }) {
  const [status, setStatus] = useState("");
  return (
    <>
      <p className="break-all text-sm text-gray-300">📧 {email}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className={CREAM_BUTTON + " text-sm"}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(email);
              setStatus("Email copied.");
            } catch {
              setStatus(
                "Copy is unavailable. Select the email above to copy it.",
              );
            }
          }}
        >
          Copy email
        </button>
        <a href={`mailto:${email}`} className={CREAM_BUTTON + " text-sm"}>
          Open mail app
        </a>
      </div>
      {status && (
        <p role="status" className="mt-2 text-xs text-gray-400">
          {status}
        </p>
      )}
    </>
  );
}
