import Link from "next/link";
import { PageShell, CREAM_BUTTON } from "../components/LeagueUI";
import { leagueUrl } from "../../../lib/league";
import { getContactConfig } from "../../../lib/contact-config";
import ContactForm from "./ContactForm";
import QuickContact from "./QuickContact";
export const dynamic = "force-dynamic";
const CARD = "rounded-2xl border border-gray-800 bg-black/20 p-5";
export default function ContactPage() {
  const contact = getContactConfig();
  return (
    <PageShell
      title="Contact CPP"
      subtitle="Questions, bugs, or beef?"
      width="max-w-5xl"
    >
      <section className="mb-10 grid gap-6 md:grid-cols-3">
        <div className={CARD + " md:col-span-2"}>
          <h2 className="mb-2 text-xl font-bold">About CPP Fantasy Football</h2>
          <p className="text-gray-300">
            One league, ten teams, and plenty of weekly chaos. CPP Fantasy
            Football brings the standings, draft, history, and league tools
            together in one place.
          </p>
          {contact.name && (
            <p className="mt-3 text-gray-400">
              Commissioner:{" "}
              <span className="font-semibold">{contact.name}</span>
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {[
              ["/rules", "Rules"],
              ["/standings", "Standings"],
              ["/teams", "Teams"],
              ["/media", "Media"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="text-blue-400 hover:text-blue-300"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className={CARD}>
          <h2 className="mb-3 text-lg font-semibold">Quick Info</h2>
          <p className="mb-3 text-sm text-gray-300">🏈 CPP Fantasy Football</p>
          {contact.email ? (
            <QuickContact email={contact.email} />
          ) : (
            <p className="text-sm text-gray-400">
              Use the league’s ESPN message board to reach the commissioner.
            </p>
          )}
          <a
            href={leagueUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className={CREAM_BUTTON + " mt-4 text-sm"}
          >
            Open CPP on ESPN ↗
          </a>
        </div>
      </section>
      <ContactForm
        email={contact.email}
        hasEndpoint={Boolean(contact.endpoint)}
      />
      <section className={CARD}>
        <h2 className="mb-4 text-center text-xl font-bold">FAQ</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            [
              "How do I contact the commissioner?",
              "Use the contact options above or your CPP league message board on ESPN.",
            ],
            [
              "Where do I ask a rules question?",
              "Choose Rules in the topic dropdown and include the relevant player, matchup, or transaction. The Rules page shows the league’s settings.",
            ],
            [
              "Trade dispute?",
              "Choose Trade dispute and include both teams, the players involved, and the week.",
            ],
            [
              "Found a bug or submitting media?",
              "Choose Website bug or Media/Press. Include your browser and steps to reproduce a bug, or a link and creator credit for media.",
            ],
          ].map(([question, answer]) => (
            <details
              key={question}
              className="rounded-xl border border-gray-800 bg-black/20 p-4"
            >
              <summary className="cursor-pointer font-semibold">
                {question}
              </summary>
              <p className="mt-2 text-sm text-gray-300">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
