// Fixed Eastern Standard Time (UTC−5), as requested for waiver/history timestamps.
const EST = "Etc/GMT+5";

export function formatEstTime(value: string | number) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  const day = date.toLocaleDateString("en-US", {
    timeZone: EST,
    month: "numeric",
    day: "numeric",
  });
  const minute = new Intl.DateTimeFormat("en-US", {
    timeZone: EST,
    minute: "numeric",
  }).format(date);
  const time = date.toLocaleTimeString("en-US", {
    timeZone: EST,
    hour: "numeric",
    ...(Number(minute) === 0 ? {} : { minute: "2-digit" as const }),
    hour12: true,
  });
  return `${day}, ${time}`;
}

/** Transaction-table format, matching the league's EST activity view. */
export function formatTransactionTime(value: string | number) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EST,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replaceAll(",", "");
}
