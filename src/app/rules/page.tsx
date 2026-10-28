import { PageShell, AccentPanel } from "../components/LeagueUI";
import { getLeagueRules, type RuleRow } from "../../../lib/league-rules";
import { positionTextClass } from "../lib/position-colors";
export const dynamic = "force-dynamic";
function RuleTable({ rows }: { rows: RuleRow[] }) {
  return (
    <table className="w-full text-left text-sm">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="odd:bg-white/[0.025]">
            <th
              scope="row"
              className={`w-1/2 px-4 py-3 font-normal ${positionTextClass(row.label.match(/\((QB|WR)\)/)?.[1] || "") || "text-gray-300"}`}
            >
              {row.label}
            </th>
            <td className="px-4 py-3">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
export default async function RulesPage() {
  const rules = await getLeagueRules();
  return (
    <PageShell
      title="League Rules"
      subtitle="CPP Fantasy Football · Official league settings. Dates are shown in Eastern Time."
    >
      <div className="space-y-8">
        {rules.sections.slice(0, 2).map((section) => (
          <AccentPanel key={section.title}>
            <h2 className="mb-4 text-2xl font-bold">{section.title}</h2>
            <RuleTable rows={section.rows} />
          </AccentPanel>
        ))}
        <AccentPanel>
          <h2 className="mb-4 text-2xl font-bold">Roster</h2>
          <RuleTable rows={rules.rosterSummary} />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-950 text-xs uppercase text-gray-400">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Position
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Starters / Slots
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Maximums
                  </th>
                </tr>
              </thead>
              <tbody>
                {rules.roster.map((slot) => (
                  <tr key={slot.slot} className="odd:bg-white/[0.025]">
                    <th
                      scope="row"
                      className={`px-4 py-3 font-normal ${positionTextClass(slot.position.match(/\((QB|WR)\)/)?.[1] || "") || "text-gray-300"}`}
                    >
                      {slot.position}
                    </th>
                    <td className="px-4 py-3">{slot.count}</td>
                    <td className="px-4 py-3">{slot.maximum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AccentPanel>
        <section>
          <h2 className="mb-5 text-center text-3xl font-bold">Scoring</h2>
          <div className="grid items-start gap-6 lg:grid-cols-2">
            {rules.scoringGroups.map((group) => (
              <AccentPanel key={group.title}>
                <h3 className="mb-4 text-xl font-bold">{group.title}</h3>
                <RuleTable rows={group.rows} />
              </AccentPanel>
            ))}
          </div>
        </section>
        {rules.divisions.length > 0 && (
          <AccentPanel>
            <h2 className="mb-4 text-2xl font-bold">Teams and Divisions</h2>
            {rules.divisions.map(
              (division: { name: string; teams: string[] }) => (
                <div key={division.name}>
                  <h3 className="bg-gray-950 px-4 py-3 font-semibold uppercase text-gray-300">
                    {division.name}
                  </h3>
                  <ul>
                    {division.teams.map((name) => (
                      <li
                        key={name}
                        className="px-4 py-2 text-sm text-gray-300 odd:bg-white/[0.025]"
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </AccentPanel>
        )}
        {rules.sections.slice(2).map((section) => (
          <AccentPanel key={section.title}>
            <h2 className="mb-4 text-2xl font-bold">{section.title}</h2>
            <RuleTable rows={section.rows} />
          </AccentPanel>
        ))}
      </div>
    </PageShell>
  );
}
