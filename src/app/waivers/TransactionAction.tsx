export default function TransactionAction({ action }: { action: string }) {
  if (action === 'Add / Cut') return <><span className="text-green-400">Add</span><span className="text-gray-500"> / </span><span className="text-red-400">Cut</span></>;
  if (action === 'Added' || action === 'Waiver add') return <span className="text-green-400">Add</span>;
  if (action === 'Dropped') return <span className="text-red-400">Cut</span>;
  return <span>{action}</span>;
}
