export default function InterviewStats({ interviews, style }) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  const todayKey = `${parts.year}-${parts.month}-${parts.day}`;
  const [year, month, day] = todayKey.split("-").map(Number);
  const today = new Date(year, month - 1, day);
  const horizon = new Date(today); horizon.setDate(horizon.getDate() + 30);
  const horizonKey = `${horizon.getFullYear()}-${String(horizon.getMonth() + 1).padStart(2, "0")}-${String(horizon.getDate()).padStart(2, "0")}`;
  const next30 = interviews.filter((item) => item.status === "upcoming" && item.date >= todayKey && item.date < horizonKey);
  const next = next30[0];
  const inMonth = interviews.filter((item) => item.date.slice(0, 7) === todayKey.slice(0, 7) && item.status !== "cancelled");
  const completed = inMonth.filter((item) => item.status === "completed").length;
  const scheduled = inMonth.filter((item) => item.status === "upcoming").length;
  const pending = interviews.filter((item) => item.status === "completed" && (item.outcome === "Pending" || !item.thankYouSent)).length;
  const days = next ? Math.max(0, Math.round((new Date(`${next.date}T00:00:00`) - today) / 86400000)) : null;
  const data = [
    ["Upcoming · next 30 days", String(next30.length), "interviews"],
    ["Next interview", next ? `${next.company} · ${next.role}` : "Nothing scheduled", next ? (days === 0 ? "Today" : `In ${days} ${days === 1 ? "day" : "days"}`) : "Schedule one when you’re ready"],
    ["This month", `${scheduled} scheduled`, `${completed} completed`],
    ["Pending follow-ups", String(pending), "completed interviews to follow up on"],
  ];

  return <section aria-label="Interview summary" className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
    {data.map(([label, value, detail]) => {
      return <article key={label} className={`flex min-h-28 min-w-0 flex-col justify-between rounded-xl border p-3 shadow-sm sm:min-h-32 sm:p-4 ${style.border} ${style.secondaryBg}`}>
        <p className={`text-[11px] font-semibold uppercase tracking-wide ${style.secondaryText}`}>{label}</p><p className={`mt-2 line-clamp-2 break-words text-base font-semibold leading-5 sm:text-lg ${style.primaryText}`} title={value}>{value}</p><p className={`mt-2 line-clamp-1 text-xs ${style.mutedText}`} title={detail}>{detail}</p>
      </article>;
    })}
  </section>;
}
