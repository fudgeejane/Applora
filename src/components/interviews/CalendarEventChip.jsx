const statusStyle = {
  upcoming: "border-blue-600 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-100",
  completed: "border-green-600 bg-green-50 text-green-900 dark:border-green-400 dark:bg-green-500/15 dark:text-green-100",
  cancelled: "border-red-600 bg-red-50 text-red-900 dark:border-red-400 dark:bg-red-500/15 dark:text-red-100",
};
export default function CalendarEventChip({ interview, onOpen }) {
  const status = interview.status || "upcoming";
  return (
    <button type="button" onClick={() => onOpen(interview)} aria-label={`${interview.time}, ${interview.role} at ${interview.company}, ${status} interview`}
      className={`block min-h-11 w-full rounded-r-md border-l-[3px] px-2 py-1.5 text-left text-[11px] leading-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-xs ${statusStyle[status] || statusStyle.upcoming}`}>
      <span className="block truncate font-semibold tabular-nums">{interview.time} · {interview.company}</span>
      <span className="block truncate">{status} · {interview.role}</span>
    </button>
  );
}
