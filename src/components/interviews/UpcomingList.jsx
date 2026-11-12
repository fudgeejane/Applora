import { Sparkles } from "lucide-react";

const safeHttpUrl = (value) => { try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } };
const formatInterviewDate = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Manila" }).format(new Date(year, month - 1, day, 12));
};

export default function UpcomingList({ interviews, style, onOpen, onPrepare }) {
  return <aside className={`min-w-0 rounded-xl border p-4 sm:p-5 ${style.border} ${style.secondaryBg}`} aria-labelledby="upcoming-interviews-heading">
    <div className="flex items-center justify-between gap-3"><div><h2 id="upcoming-interviews-heading" className={`text-base font-semibold ${style.primaryText}`}>Coming up</h2><p className={`mt-0.5 text-xs ${style.secondaryText}`}>Your next scheduled conversations</p></div><span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-500/15 dark:text-blue-200">{interviews.length}</span></div>
    {interviews.length ? <ul className="mt-4 space-y-3">{interviews.slice(0, 8).map((item) => <li key={item.id} className={`min-w-0 rounded-lg border-l-[3px] border-blue-600 p-3 pl-3.5 dark:border-blue-400 ${style.grayBg}`}>
      <button type="button" onClick={() => onOpen(item)} className={`block max-w-full text-left text-sm font-semibold ${style.primaryText} hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}>{item.company}</button>
      <p className={`mt-0.5 break-words text-sm ${style.secondaryText}`}>{item.role}</p>
      <p className={`mt-2 text-xs font-medium ${style.primaryText}`}>{formatInterviewDate(item.date)} <span className={style.mutedText}>at</span> {item.time}</p>
      <p className={`mt-1 break-words text-xs ${style.secondaryText}`}>{item.type || "Interview"} <span aria-hidden="true">·</span> {item.format || "Format not set"}</p>
      <span className="mt-2 inline-flex min-h-6 items-center gap-1.5 rounded-full bg-blue-100 px-2.5 text-xs font-medium text-blue-900 dark:bg-blue-500/20 dark:text-blue-100"><span className="h-1.5 w-1.5 rounded-full bg-blue-700 dark:bg-blue-300"/>Upcoming</span>
      <div className="mt-3 flex flex-wrap gap-2">{safeHttpUrl(item.meetingLink) && <a href={safeHttpUrl(item.meetingLink)} target="_blank" rel="noreferrer" className={`inline-flex min-h-9 items-center rounded-md border px-3 text-xs font-medium ${style.border} ${style.primaryText} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}>Join</a>}<button type="button" onClick={() => onPrepare(item.application)} className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Sparkles size={14} aria-hidden="true"/>Prepare</button><button type="button" onClick={() => onOpen(item)} className={`inline-flex min-h-9 items-center rounded-md px-3 text-xs font-medium ${style.primaryText} ${style.hoverBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}>Details</button></div>
    </li>)}</ul> : <div className={`mt-4 rounded-lg border border-dashed p-5 text-center ${style.border}`}><p className={`text-sm font-medium ${style.primaryText}`}>Nothing coming up</p><p className={`mt-1 text-xs leading-5 ${style.secondaryText}`}>Scheduled interviews will appear here.</p></div>}
  </aside>;
}
