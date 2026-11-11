import { useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ChevronRight, MapPin, Phone, Video } from "lucide-react";
import { useAuth } from "../../contexts/useAuth";
import { useStyle } from "../../components/ui/Style";
import { getDashboardStats } from "../../utils/dashboardStats";

const stages = [
  { key: "applied", label: "Applied", filter: "Applied", color: "bg-blue-300 dark:bg-blue-800" },
  { key: "underReview", label: "Under review", filter: "Screening", color: "bg-blue-400 dark:bg-blue-700" },
  { key: "interview", label: "Interview", filter: "Interview", color: "bg-blue-500 dark:bg-blue-600" },
  { key: "offer", label: "Offer", filter: "Offer", color: "bg-blue-700 dark:bg-blue-400" },
];

const statusColors = {
  Applied: "bg-blue-600 dark:bg-blue-400",
  Screening: "bg-amber-600 dark:bg-amber-400",
  "Under Review": "bg-amber-600 dark:bg-amber-400",
  Interview: "bg-violet-600 dark:bg-violet-400",
  Offer: "bg-emerald-600 dark:bg-emerald-400",
  Accepted: "bg-emerald-600 dark:bg-emerald-400",
  Rejected: "bg-red-600 dark:bg-red-400",
  Withdrawn: "bg-slate-500 dark:bg-slate-400",
};
const emptyApplications = [];

function localDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatExactDate(value, options = { month: "short", day: "numeric", year: "numeric" }) {
  const date = localDate(value);
  return date ? new Intl.DateTimeFormat("en", options).format(date) : value || "—";
}

function dayDifference(later, earlier) {
  const laterDay = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  const earlierDay = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  return Math.round((laterDay - earlierDay) / 86400000);
}

function relativeDate(value, now = new Date()) {
  const date = localDate(value);
  if (!date) return "—";
  const difference = dayDifference(date, now);
  if (difference === 0) return "Today";
  if (difference === 1) return "Tomorrow";
  if (difference === -1) return "Yesterday";
  if (difference > 1 && difference <= 6) return `In ${difference} days`;
  if (difference < -1 && difference >= -6) return `${Math.abs(difference)} days ago`;
  return formatExactDate(value, { month: "short", day: "numeric" });
}

function relativeInterviewDate(value, now = new Date()) {
  const date = localDate(value);
  if (!date) return "";
  const difference = dayDifference(date, now);
  if (difference === 0) return "today";
  if (difference === 1) return "tomorrow";
  return `in ${difference} days`;
}

function formatTime(value) {
  if (!value) return "";
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
}

function DashboardHeader({ firstName, summary, style, loading, showAction }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (loading) {
    return (
      <header className="mb-8 flex items-center justify-between gap-6" aria-label="Dashboard">
        <div className="w-full max-w-md space-y-3">
          <div className="h-8 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </header>
    );
  }

  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className={`text-2xl font-semibold tracking-tight ${style.primaryText}`}>
          {greeting}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className={`mt-1 text-sm ${style.secondaryText}`}>{summary}</p>
      </div>
      {showAction && (
        <Link
          to="/applications?add=true"
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400"
        >
          Add application
        </Link>
      )}
    </header>
  );
}

function UpNextBanner({ item, style, loading }) {
  if (loading) {
    return <div className="mb-8 h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" aria-label="Loading next action" />;
  }

  const interview = item?.interview;
  const company = interview?.company || item?.application?.company;
  const title = item?.type === "interview"
    ? `Interview with ${company}`
    : item?.type === "follow-up"
      ? `Follow up with ${company}`
      : item?.type === "no-response"
        ? `No response from ${company} in ${item.daysSinceUpdate} days`
        : "You're all caught up.";
  const dateLine = interview
    ? [formatExactDate(interview.date, { month: "short", day: "numeric" }), formatTime(interview.time), interview.type]
      .filter(Boolean)
      .join(" · ")
    : "";
  const subtitle = item?.type === "interview"
    ? `${dateLine} · ${relativeInterviewDate(interview.date)}`
    : item?.type === "no-response"
      ? "Consider sending a brief follow-up."
      : item?.type === "follow-up"
        ? "A follow-up is due."
        : "There’s nothing that needs your attention right now.";

  return (
    <section
      aria-labelledby="up-next-title"
      className="relative mb-8 overflow-hidden rounded-xl bg-blue-50/80 px-5 py-4 dark:bg-blue-950/40 sm:px-6"
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-blue-600 dark:bg-blue-400" aria-hidden="true" />
      <div className="flex flex-col gap-3 pl-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Up next</p>
          <h2 id="up-next-title" className={`mt-1 text-base font-semibold ${style.primaryText}`}>{title}</h2>
          <p className={`mt-1 text-sm ${style.secondaryText}`}>{subtitle}</p>
        </div>
        {item && (
          <Link
            to={`/applications/${encodeURIComponent(item.applicationId)}`}
            className="inline-flex shrink-0 items-center gap-1 self-start rounded-md text-sm font-medium text-blue-700 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-300 dark:hover:text-blue-200 sm:self-center"
          >
            View details <ChevronRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}

function StatsStrip({ stats, style, loading }) {
  if (loading) {
    return (
      <section aria-label="Loading application statistics" className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        ))}
      </section>
    );
  }

  const metrics = [
    { label: "Total", value: stats.total, href: "/applications", definition: "All non-archived applications." },
    { label: "Active", value: stats.active, href: "/applications?status=active", definition: "Applications in Applied, Screening, or Under Review status." },
    { label: "Interviews", value: stats.interviews, href: "/applications?status=interviews", definition: "Scheduled interviews on or after today." },
    { label: "Offers", value: stats.offers, href: "/applications?status=Offer", definition: "Applications with an Offer or Accepted status." },
    { label: "Response rate", value: `${stats.responseRate}%`, href: "/applications?status=responded", definition: "Applications not in Applied status, divided by all non-archived applications." },
    { label: "Offer rate", value: `${stats.offerRate}%`, href: "/applications?status=Offer", definition: "Offer or Accepted applications, divided by all non-archived applications." },
  ];

  return (
    <section aria-label="Application statistics" className="mb-8 grid grid-cols-2 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
      {metrics.map((metric, index) => {
        const mobileAlignment = index % 2 === 1 ? "right-0 left-auto" : "left-0 right-auto";
        const tabletAlignment = index % 3 === 2 ? "sm:right-0 sm:left-auto" : "sm:left-2 sm:right-auto";
        const desktopAlignment = index === 5 ? "lg:right-0 lg:left-auto" : "lg:left-2 lg:right-auto";
        return (
          <Link
            key={metric.label}
            to={metric.href}
            title={metric.definition}
            aria-label={`${metric.label}: ${metric.value}. ${metric.definition}`}
            className={`group relative min-w-0 rounded-sm px-3 first:pl-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${index > 0 ? `border-l ${style.border}` : ""}`}
          >
            <span className={`block text-3xl font-semibold tabular-nums tracking-tight group-hover:text-blue-700 dark:group-hover:text-blue-300 ${style.primaryText}`}>
              {metric.value}
            </span>
            <span className={`mt-1 block text-xs ${style.secondaryText}`}>{metric.label}</span>
            <span
              role="tooltip"
              className={`invisible absolute ${mobileAlignment} ${tabletAlignment} ${desktopAlignment} top-full z-20 mt-2 w-52 rounded-lg border p-2.5 text-xs leading-5 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100 ${style.border} ${style.secondaryBg} ${style.secondaryText}`}
            >
              {metric.definition}
            </span>
          </Link>
        );
      })}
    </section>
  );
}

function PipelineBar({ counts, total, style, loading }) {
  if (loading) {
    return <section aria-label="Loading application pipeline" className="mb-8 space-y-3"><div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /><div className="h-3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /></section>;
  }

  const pipelineStages = [
    ...stages.filter(({ key }) => counts[key] > 0),
    ...(counts.rejected ? [{ key: "rejected", label: "Rejected", filter: "Rejected", color: "bg-red-500" }] : []),
    ...(counts.withdrawn ? [{ key: "withdrawn", label: "Withdrawn", filter: "Withdrawn", color: "bg-slate-400 dark:bg-slate-500" }] : []),
  ];

  return (
    <section aria-labelledby="pipeline-title" className="mb-8 border-y border-slate-200 py-5 dark:border-white/10">
      <h2 id="pipeline-title" className={`mb-4 text-sm font-semibold ${style.primaryText}`}>Pipeline</h2>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" aria-label="Applications by stage">
        {pipelineStages.map((stage) => (
          <Link
            key={stage.key}
            to={`/applications?status=${encodeURIComponent(stage.filter)}`}
            aria-label={`${stage.label}: ${counts[stage.key]}`}
            title={`${stage.label}: ${counts[stage.key]}`}
            className={`${stage.color} min-w-1 transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
            style={{ width: `${(counts[stage.key] / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {pipelineStages.map((stage) => (
          <Link
            key={stage.key}
            to={`/applications?status=${encodeURIComponent(stage.filter)}`}
            className={`inline-flex items-center gap-2 rounded-sm text-sm ${style.secondaryText} hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-blue-300`}
          >
            <span className={`h-2 w-2 rounded-full ${stage.color}`} aria-hidden="true" />
            {stage.label}
            <span className={`tabular-nums ${style.primaryText}`}>{counts[stage.key]}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function interviewIcon(type) {
  if (/phone/i.test(type || "")) return Phone;
  if (/on.site|onsite/i.test(type || "")) return MapPin;
  return Video;
}

function UpcomingInterviews({ interviews, style, loading }) {
  if (loading) {
    return <section aria-label="Loading upcoming interviews" className="space-y-4"><div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /><div className="h-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /><div className="h-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /></section>;
  }

  return (
    <section aria-labelledby="upcoming-title" className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="upcoming-title" className={`text-base font-semibold ${style.primaryText}`}>Upcoming interviews</h2>
        <Link to="/interviews" className="rounded-sm text-sm font-medium text-blue-700 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-300 dark:hover:text-blue-200">View all</Link>
      </div>
      {interviews.length ? (
        <div className="divide-y divide-slate-200 dark:divide-white/10">
          {interviews.map((interview) => {
            const Icon = interviewIcon(interview.type);
            return (
              <Link
                key={`${interview.applicationId}-${interview.date}`}
                to={`/applications/${encodeURIComponent(interview.applicationId)}`}
                className={`group flex min-w-0 items-center gap-3 rounded-lg py-3 transition-colors hover:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-white/5 sm:px-2`}
              >
                <span className="w-12 shrink-0 text-center">
                  <span className={`block text-[10px] font-semibold uppercase tracking-wide ${style.mutedText}`}>{formatExactDate(interview.date, { month: "short" })}</span>
                  <span className={`block text-lg font-semibold tabular-nums leading-5 ${style.primaryText}`}>{formatExactDate(interview.date, { day: "2-digit" })}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-medium ${style.primaryText}`}>{interview.company}</span>
                  <span className={`mt-0.5 block truncate text-xs ${style.secondaryText}`}>{interview.role}</span>
                </span>
                <span className={`hidden shrink-0 items-center gap-1.5 text-xs ${style.secondaryText} sm:flex`}>
                  <Icon size={14} aria-hidden="true" />
                  {formatTime(interview.time)}
                  {interview.type ? ` · ${interview.type}` : ""}
                </span>
                <ChevronRight size={16} className={`shrink-0 ${style.mutedText}`} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      ) : (
        <p className={`rounded-lg py-5 text-sm ${style.secondaryText}`}>
          No interviews scheduled. <Link to="/interviews" className="font-medium text-blue-700 hover:underline dark:text-blue-300">Schedule one</Link>
        </p>
      )}
    </section>
  );
}

function StatusDot({ status, style }) {
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap text-xs ${style.secondaryText}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${statusColors[status] || "bg-slate-500 dark:bg-slate-400"}`} aria-hidden="true" />
      {status === "Accepted" ? "Offer" : status === "Under Review" ? "Screening" : status}
    </span>
  );
}

function RecentApplications({ applications, style, loading }) {
  if (loading) {
    return <section aria-label="Loading recent applications" className="space-y-4"><div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />)}</section>;
  }

  return (
    <section aria-labelledby="recent-title" className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="recent-title" className={`text-base font-semibold ${style.primaryText}`}>Recent applications</h2>
        <Link to="/applications" className="rounded-sm text-sm font-medium text-blue-700 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-300 dark:hover:text-blue-200">View all</Link>
      </div>
      {applications.length ? (
        <div role="table" aria-label="Recent applications">
          <div role="row" className={`hidden grid-cols-[minmax(0,1fr)_112px_112px_16px] gap-3 border-b border-slate-200 px-2 py-2 text-xs font-medium ${style.secondaryText} dark:border-white/10 sm:grid`}>
            <span role="columnheader">Company / role</span>
            <span role="columnheader">Applied</span>
            <span role="columnheader">Status</span>
            <span aria-hidden="true" />
          </div>
          <div>
            {applications.map((application) => (
              <Link
                key={application.id}
                role="row"
                to={`/applications/${encodeURIComponent(application.id)}`}
                className="group grid grid-cols-[minmax(0,1fr)_16px] items-center gap-3 border-b border-slate-200 px-2 py-3 last:border-0 hover:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:border-white/10 dark:hover:bg-white/5 sm:grid-cols-[minmax(0,1fr)_112px_112px_16px]"
              >
                <span role="cell" className="min-w-0">
                  <span className={`block truncate text-sm font-medium ${style.primaryText}`}>{application.company}</span>
                  <span className={`mt-0.5 block truncate text-xs ${style.secondaryText}`}>{application.role}</span>
                  <span className={`mt-1 block text-xs sm:hidden ${style.mutedText}`}>
                    {relativeDate(application.dateApplied)} · {application.status === "Accepted" ? "Offer" : application.status}
                  </span>
                </span>
                <span role="cell" title={formatExactDate(application.dateApplied)} className={`hidden whitespace-nowrap text-xs sm:block ${style.secondaryText}`}>
                  {relativeDate(application.dateApplied)}
                </span>
                <span role="cell" className="hidden sm:block"><StatusDot status={application.status} style={style} /></span>
                <ChevronRight size={16} className="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 dark:text-slate-500" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p className={`py-5 text-sm ${style.secondaryText}`}>No recent applications.</p>
      )}
    </section>
  );
}

export default function HomePage() {
  const style = useStyle();
  const context = useOutletContext() || {};
  const { user } = useAuth();
  const loading = !Array.isArray(context.applications);
  const applications = context.applications || emptyApplications;
  const stats = useMemo(() => getDashboardStats(applications), [applications]);
  const recentApplications = useMemo(
    () => [...stats.applications]
      .sort((left, right) => (right.dateApplied || "").localeCompare(left.dateApplied || ""))
      .slice(0, 5),
    [stats.applications],
  );
  const firstName = user?.firstName?.trim();
  const summary = `${stats.active} active ${stats.active === 1 ? "application" : "applications"} · ${stats.interviewsThisWeek} interview${stats.interviewsThisWeek === 1 ? "" : "s"} in the next 7 days`;

  if (!loading && stats.total === 0) {
    return (
      <div className={`mx-auto w-full max-w-[1152px] dashboard-fade-in ${style.primaryText}`}>
        <DashboardHeader firstName={firstName} summary="A clear place to keep your job search moving." style={style} showAction={false} />
        <section className={`rounded-xl border border-dashed px-6 py-12 text-center ${style.border} ${style.secondaryBg}`}>
          <h2 className="text-lg font-semibold">Your job search starts here</h2>
          <p className={`mx-auto mt-2 max-w-sm text-sm ${style.secondaryText}`}>Keep your applications, interviews, and follow-ups in one place.</p>
          <Link
            to="/applications?add=true"
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            Add your first application
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className={`mx-auto w-full max-w-[1152px] dashboard-fade-in ${style.primaryText}`}>
      <DashboardHeader
        firstName={firstName}
        summary={summary}
        style={style}
        loading={loading}
        showAction={stats.total > 0}
      />
      <UpNextBanner item={stats.upNext} style={style} loading={loading} />
      <StatsStrip stats={stats} style={style} loading={loading} />
      <PipelineBar counts={stats.counts} total={stats.total} style={style} loading={loading} />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <UpcomingInterviews interviews={stats.upcomingInterviews} style={style} loading={loading} />
        <RecentApplications applications={recentApplications} style={style} loading={loading} />
      </div>
    </div>
  );
}
