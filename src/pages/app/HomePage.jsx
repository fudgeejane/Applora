import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Activity, ArrowUpRight, BriefcaseBusiness, CalendarDays, CheckCircle2,
  Clock3, Filter, LayoutGrid, List, Plus, Search, Send,
} from "lucide-react";
import { useStyle } from "../../components/ui/Style";
import {
  PageTitle, Panel, ProgressBar, SectionHeading, StatCard, StatusBadge, TabButton,
} from "../../components/dashboard/DashboardUI";

const applications = [
  { role: "Senior Product Designer", company: "Northstar Digital", location: "Makati City", workSetup: "Hybrid", status: "Interview", date: "Nov 14, 10:30 AM", initials: "ND", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" },
  { role: "Product Designer", company: "Horizon Labs", location: "Remote", workSetup: "Remote", status: "Applied", date: "Nov 12, 2026", initials: "HL", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
  { role: "UX Designer", company: "Brightline Studio", location: "Quezon City", workSetup: "On-site", status: "Under Review", date: "Nov 10, 2026", initials: "BS", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  { role: "Visual Designer", company: "Cloud Harbor", location: "Pasig City", workSetup: "Hybrid", status: "Applied", date: "Nov 08, 2026", initials: "CH", color: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300" },
  { role: "UI/UX Designer", company: "Pixel & Form", location: "Taguig City", workSetup: "On-site", status: "Offer", date: "Nov 06, 2026", initials: "PF", color: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300" },
];

const statusTone = { Applied: "blue", Interview: "purple", "Under Review": "orange", Offer: "green" };

export default function HomePage() {
  const style = useStyle();
  const context = useOutletContext() || {};
  const [view, setView] = useState("List");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const combinedQuery = `${query} ${context.searchQuery || ""}`.trim().toLowerCase();
  const visibleApplications = useMemo(
    () => applications.filter((app) => {
      const matchesSearch = `${app.role} ${app.company} ${app.location} ${app.status}`.toLowerCase().includes(combinedQuery);
      return matchesSearch && (filter === "All statuses" || app.status === filter);
    }),
    [combinedQuery, filter],
  );
  const stats = [
    { label: "Total applications", value: "24", note: "+4 this month", icon: BriefcaseBusiness, tone: "blue" },
    { label: "In progress", value: "12", note: "Across 8 companies", icon: Clock3, tone: "orange" },
    { label: "Interviews", value: "5", note: "2 scheduled this week", icon: CalendarDays, tone: "purple" },
    { label: "Response rate", value: "68%", note: "+12% from last month", icon: CheckCircle2, tone: "green" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageTitle
        title="Applications"
        description="Keep your job search organized and moving forward."
        action={
          <button type="button" className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${style.buttonBlue}`}>
            <Plus size={17} /> Add application
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} style={style} />)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.8fr)]">
        <Panel style={style} className="min-w-0">
          <SectionHeading
            title="Application tracker"
            subtitle="A snapshot of your current opportunities"
            style={style}
            action={
              <div className={`flex rounded-xl border p-1 ${style.border}`}>
                <TabButton active={view === "List"} onClick={() => setView("List")} style={style}><List size={16} className="mr-1.5 inline" />List</TabButton>
                <TabButton active={view === "Kanban"} onClick={() => setView("Kanban")} style={style}><LayoutGrid size={16} className="mr-1.5 inline" />Board</TabButton>
              </div>
            }
          />
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <label className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 ${style.input}`}>
              <Search size={16} className={style.mutedText} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search applications..." aria-label="Search applications" className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none" />
            </label>
            <label className={`flex items-center gap-2 rounded-lg border px-3 ${style.input}`}>
              <Filter size={15} className={style.mutedText} />
              <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter by status" className="bg-transparent py-2.5 text-sm outline-none">
                {["All statuses", "Applied", "Under Review", "Interview", "Offer"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>

          {view === "Kanban" ? (
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {["Applied", "Under Review", "Interview", "Offer"].map((status) => (
                <div key={status} className={`min-w-0 rounded-xl p-3 ${style.grayBg}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <StatusBadge tone={statusTone[status]}>{status}</StatusBadge>
                    <span className={`text-xs ${style.mutedText}`}>{visibleApplications.filter((app) => app.status === status).length}</span>
                  </div>
                  <div className="space-y-2">
                    {visibleApplications.filter((app) => app.status === status).map((app) => (
                      <article key={app.company} className={`rounded-lg border p-3 ${style.card}`}>
                        <p className={`text-sm font-semibold ${style.primaryText}`}>{app.role}</p>
                        <p className={`mt-1 text-xs ${style.secondaryText}`}>{app.company}</p>
                        <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 text-xs ${style.mutedText}`}>
                          <span>{app.date}</span>
                          <span className={`rounded-full px-2 py-1 ${style.grayBg} ${style.secondaryText}`}>{app.workSetup}</span>
                        </div>
                      </article>
                    ))}
                    {!visibleApplications.some((app) => app.status === status) && <p className={`py-4 text-center text-xs ${style.mutedText}`}>No applications</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className={`${style.secondaryText} text-xs`}>
                  <tr className={`border-b ${style.border}`}>
                    {["Role & company", "Location", "Work setup", "Status", "Applied"].map((heading) => <th key={heading} className="px-3 py-3 font-medium">{heading}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {visibleApplications.map((app) => (
                    <tr key={app.company} className={`border-b last:border-0 ${style.border}`}>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${app.color}`}>{app.initials}</span>
                          <span className="min-w-0"><span className={`block truncate font-medium ${style.primaryText}`}>{app.role}</span><span className={`mt-0.5 block truncate text-xs ${style.secondaryText}`}>{app.company}</span></span>
                        </div>
                      </td>
                      <td className={`px-3 py-3.5 ${style.secondaryText}`}>{app.location}</td>
                      <td className={`px-3 py-3.5 ${style.secondaryText}`}><StatusBadge tone="gray">{app.workSetup}</StatusBadge></td>
                      <td className="px-3 py-3.5"><StatusBadge tone={statusTone[app.status]}>{app.status}</StatusBadge></td>
                      <td className={`px-3 py-3.5 ${style.secondaryText}`}>{app.date}</td>
                    </tr>
                  ))}
                  {visibleApplications.length === 0 && <tr><td colSpan="5" className={`px-3 py-10 text-center ${style.secondaryText}`}>No applications match your filters.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel style={style}>
            <SectionHeading title="Upcoming interviews" style={style} action={<button type="button" aria-label="View interviews" className={`rounded-lg p-2 ${style.hoverBg}`}><ArrowUpRight size={17} /></button>} />
            <div className={`rounded-xl border p-3.5 ${style.border}`}>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"><CalendarDays size={18} /></div>
                <div className="min-w-0"><p className={`text-sm font-semibold ${style.primaryText}`}>Product Designer</p><p className={`mt-0.5 text-xs ${style.secondaryText}`}>Northstar Digital</p></div>
              </div>
              <p className={`mt-3 text-xs ${style.secondaryText}`}>Friday, November 14 <span className={style.mutedText}>·</span> 10:30 AM</p>
              <div className={`mt-3 flex items-center gap-2 border-t pt-3 text-xs ${style.border} ${style.secondaryText}`}><Clock3 size={14} /> In 2 days <span className="ml-auto">Video call</span></div>
            </div>
            <div className={`mt-3 rounded-xl border p-3.5 ${style.border}`}>
              <p className={`text-sm font-semibold ${style.primaryText}`}>UX Designer</p>
              <p className={`mt-1 text-xs ${style.secondaryText}`}>Brightline Studio · Nov 17, 2:00 PM</p>
            </div>
          </Panel>

          <Panel style={style}>
            <SectionHeading title="Follow-up reminders" style={style} />
            <div className="space-y-4">
              {[["Send a follow-up email", "Horizon Labs · Due tomorrow", 72], ["Check application status", "Cloud Harbor · Due in 3 days", 46]].map(([title, detail, progress]) => (
                <div key={title}>
                  <div className="flex items-start gap-2.5"><span className="mt-0.5 rounded-lg bg-orange-100 p-1.5 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"><Send size={14} /></span><div className="min-w-0 flex-1"><p className={`text-sm font-medium ${style.primaryText}`}>{title}</p><p className={`mt-1 text-xs ${style.secondaryText}`}>{detail}</p></div></div>
                  <div className="mt-3"><ProgressBar value={progress} style={style} tone="orange" /></div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel style={style}>
            <SectionHeading title="Recent activity" style={style} />
            <div className="space-y-4">
              {[["Application moved to interview", "Northstar Digital · 2 hours ago"], ["New application added", "Horizon Labs · Yesterday"], ["Resume viewed", "Brightline Studio · Nov 9"]].map(([title, detail]) => (
                <div key={title} className="flex gap-3"><span className="mt-0.5 rounded-full bg-blue-100 p-2 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"><Activity size={14} /></span><div><p className={`text-sm font-medium ${style.primaryText}`}>{title}</p><p className={`mt-1 text-xs ${style.secondaryText}`}>{detail}</p></div></div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
