export type Transaction = {
  id: string;
  groupId?: string;
  date: string | null;
  action: string;
  team: string;
  playerName: string;
  currentTeam: string;
  teamId?: number | null;
  pointsSince?: number | null;
  gamesSince?: number | null;
};
export type TransactionRow = Transaction & { players: Transaction[] };

export function transactionInsight(row: TransactionRow) {
  if (row.players.some((player) => player.pointsSince == null))
    return { kind: "unavailable", points: null };
  const added = row.players.filter(
    (player) => player.action === "Added" || player.action === "Waiver add",
  );
  const cut = row.players.filter((player) => player.action === "Dropped");
  const sum = (players: Transaction[]) =>
    players.reduce((total, player) => total + player.pointsSince!, 0);
  return {
    kind: "net",
    points: Math.round((sum(added) - sum(cut)) * 100) / 100,
  };
}

export function groupTransactionRows(
  transactions: Transaction[],
): TransactionRow[] {
  const groups = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    // Only combine moves linked by ESPN's activity event and transaction team.
    const key = JSON.stringify([
      transaction.groupId || transaction.id,
      transaction.teamId ?? transaction.team,
    ]);
    const group = groups.get(key) || [];
    group.push(transaction);
    groups.set(key, group);
  }
  const rows: TransactionRow[] = [];
  for (const group of groups.values()) {
    const adds = group.filter(
      (item) => item.action === "Added" || item.action === "Waiver add",
    );
    const drops = group.filter((item) => item.action === "Dropped");
    if (adds.length && drops.length) {
      rows.push({
        ...group[0],
        id: `combined:${group[0].id}`,
        action: "Add / Cut",
        players: [...adds, ...drops],
      });
      rows.push(
        ...group
          .filter((item) => !adds.includes(item) && !drops.includes(item))
          .map((item) => ({ ...item, players: [item] })),
      );
    } else {
      rows.push(...group.map((item) => ({ ...item, players: [item] })));
    }
  }
  return rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
