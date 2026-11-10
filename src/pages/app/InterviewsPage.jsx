import { useState } from "react";
import {
  ArrowLeft, ArrowRight, Bell, CalendarDays, CheckCircle2, Clock3,
  MessageSquareText, Plus, Video,
} from "lucide-react";
import { useStyle } from "../../components/ui/Style";
import {
  PageTitle, Panel, SectionHeading, StatCard, StatusBadge, TabButton,
} from "../../components/dashboard/DashboardUI";

const interviewData = [
  { day: "14", month: "NOV", time: "10:30 AM", role: "Senior Product Designer", company: "Northstar Digital", type: "Video call", status: "Upcoming", tone: "purple" },
  { day: "17", month: "NOV", time: "2:00 PM", role: "UX Designer", company: "Brightline Studio", type: "On-site · Quezon City", status: "Upcoming", tone: "blue" },
  { day: "19", month: "NOV", time: "11:00 AM", role: "Product Designer", company: "Horizon Labs", type: "Video call", status: "Upcoming", tone: "purple" },
  { day: "08", month: "NOV", time: "3:00 PM", role: "Visual Designer", company: "Cloud Harbor", type: "Completed", status: "Completed", tone: "green" },
];

export default function InterviewsPage() {
  const style = useStyle();
  const [view, setView] = useState("Calendar");
  const [selected, setSelected] = useState(0);
  const interview = interviewData[selected];
  const stats = [
    { label: "Total interviews", value: "12", note: "Across 8 companies", icon: CalendarDays, tone: "blue" },
    { label: "Upcoming", value: "3", note: "Next one in 2 days", icon: Clock3, tone: "purple" },
    { label: "Completed", value: "9", note: "This job search", icon: CheckCircle2, tone: "green" },
    { label: "Response rate", value: "75%", note: "After first interviews", icon: MessageSquareText, tone: "orange" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageTitle
        title="Interview management"
        description="Plan ahead, feel prepared, and keep every conversation on track."
        action={<button type="button" className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${style.buttonBlue}`}><Plus size={17} /> Schedule interview</button>}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">{stats.map((stat) => <StatCard key={stat.label} {...stat} style={style} />)}</div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(290px,0.75fr)]">
        <Panel style={style} className="min-w-0">
          <SectionHeading
            title="Your schedule"
            subtitle="November 2026"
            style={style}
            action={<div className="flex items-center gap-2"><div className={`flex rounded-xl border p-1 ${style.border}`}><TabButton active={view === "Calendar"} onClick={() => setView("Calendar")} style={style}>Calendar</TabButton><TabButton active={view === "List"} onClick={() => setView("List")} style={style}>List</TabButton></div></div>}
          />
          {view === "Calendar" ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className={`text-sm font-semibold ${style.primaryText}`}>November 2026</p>
                <div className="flex gap-1"><button type="button" aria-label="Previous month" className={`rounded-lg p-2 ${style.hoverBg}`}><ArrowLeft size={16} /></button><button type="button" aria-label="Next month" className={`rounded-lg p-2 ${style.hoverBg}`}><ArrowRight size={16} /></button></div>
              </div>
              <div className="grid grid-cols-7 border-l border-t text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className={`border-b border-r py-2 text-[11px] font-medium ${style.border} ${style.secondaryText}`}>{day}</div>)}
                {Array.from({ length: 35 }, (_, index) => {
                  const date = index - 5;
                  const inMonth = date > 0 && date <= 30;
                  const interviewIndex = interviewData.findIndex((item) => Number(item.day) === date && item.month === "NOV");
                  return (
                    <button
                      type="button"
                      key={index}
                      onClick={() => interviewIndex >= 0 && setSelected(interviewIndex)}
                      className={`relative min-h-16 border-b border-r p-1.5 text-left sm:min-h-20 ${style.border} ${!inMonth ? "opacity-35" : ""} ${interviewIndex >= 0 ? style.blueHover : style.hoverBg}`}
                    >
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${date === 10 && inMonth ? "bg-blue-600 font-semibold text-white" : style.secondaryText}`}>{inMonth ? date : date <= 0 ? 30 + date : date - 30}</span>
                      {interviewIndex >= 0 && <span className="mt-1 block truncate rounded bg-blue-100 px-1 py-0.5 text-[9px] font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{interviewData[interviewIndex].role}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs">
                <span className={`inline-flex items-center gap-1.5 ${style.secondaryText}`}><span className="h-2 w-2 rounded-full bg-blue-500" />Interview</span>
                <span className={`inline-flex items-center gap-1.5 ${style.secondaryText}`}><span className="h-2 w-2 rounded-full bg-green-500" />Completed</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {interviewData.map((item, index) => (
                <button key={`${item.company}-${item.day}`} type="button" onClick={() => setSelected(index)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${index === selected ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10" : `${style.border} ${style.hoverBg}`}`}>
                  <span className={`w-12 shrink-0 rounded-lg p-2 text-center ${style.grayBg}`}><span className={`block text-[10px] font-semibold ${style.secondaryText}`}>{item.month}</span><span className={`text-lg font-bold ${style.primaryText}`}>{item.day}</span></span>
                  <span className="min-w-0 flex-1"><span className={`block truncate text-sm font-semibold ${style.primaryText}`}>{item.role}</span><span className={`mt-1 block text-xs ${style.secondaryText}`}>{item.company} · {item.time}</span></span>
                  <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel style={style}>
            <SectionHeading title="Interview details" style={style} action={<StatusBadge tone={interview.tone}>{interview.status}</StatusBadge>} />
            <p className={`text-lg font-semibold ${style.primaryText}`}>{interview.role}</p>
            <p className={`mt-1 text-sm ${style.secondaryText}`}>{interview.company}</p>
            <div className={`mt-4 space-y-3 border-t pt-4 text-sm ${style.border} ${style.secondaryText}`}>
              <div className="flex items-center gap-2.5"><CalendarDays size={16} /><span>November {interview.day}, 2026</span></div>
              <div className="flex items-center gap-2.5"><Clock3 size={16} /><span>{interview.time} · 45 minutes</span></div>
              <div className="flex items-center gap-2.5"><Video size={16} /><span>{interview.type}</span></div>
            </div>
            {interview.status === "Upcoming" && <button type="button" className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${style.secondaryButton}`}><Bell size={16} /> Reminder set</button>}
          </Panel>

          <Panel style={style}>
            <SectionHeading title="Preparation notes" subtitle="Your notes for this conversation" style={style} />
            <textarea defaultValue={`• Review the company's latest product launch\n• Prepare examples of design system work\n• Ask about the team's research process`} rows={4} aria-label="Preparation notes" className={`w-full resize-y rounded-lg border p-3 text-sm leading-6 ${style.input} ${style.inputFocus}`} />
            <p className={`mt-2 text-right text-xs ${style.mutedText}`}>Saved locally for this preview</p>
          </Panel>

          <Panel style={style}>
            <SectionHeading title="Feedback & follow-up" style={style} />
            {interview.status === "Completed" ? (
              <div className={`rounded-lg p-3 text-sm ${style.greenBg2} ${style.coorectText}`}><p className="font-medium">Good conversation</p><p className="mt-1 text-xs">Positive feedback · Follow up by Nov 10</p></div>
            ) : (
              <div className={`rounded-lg p-3 text-sm ${style.yellowBg}`}><div className="flex items-start gap-2"><Bell size={16} className="mt-0.5 shrink-0" /><p><span className="font-medium">Prepare for your interview</span><span className="mt-1 block text-xs">Review your notes the day before.</span></p></div></div>
            )}
            <button type="button" className={`mt-3 w-full rounded-lg border px-3 py-2 text-sm ${style.secondaryButton}`}>Add feedback</button>
          </Panel>
        </div>
      </div>
    </div>
  );
}
