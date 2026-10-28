import { notFound } from "next/navigation";
import TeamPage from "../_TeamPage";

export default async function Page({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  if (!/^\d{1,4}$/.test(teamId)) notFound();
  return <TeamPage teamId={teamId} />;
}
