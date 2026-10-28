import { leagueUrl } from "../../../lib/league";
export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-center">
      <h1 className="text-4xl font-bold">Contact</h1>
      <p className="mt-5 text-gray-300">
        Use your league’s ESPN message board to contact the commissioner or
        other managers.
      </p>
      <a
        href={leagueUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-block rounded-xl bg-[#D9D7B6] px-5 py-3 font-semibold text-black"
      >
        Open league on ESPN ↗
      </a>
    </div>
  );
}
