import { useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/useAuth";
import { useStyle } from "../../components/ui/Style";
import { getDashboardStats } from "../../utils/dashboardStats";
import { SquareArrowOutUpRight, BadgePlus } from "lucide-react";

export function PageTitle({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#333333] dark:text-[#E0E0E0] sm:text-3xl">{title}</h1>
        <p className="mt-1.5 text-sm text-[#666666] dark:text-[#B0B0B0]">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = "", style, ...props }) {
  return <section className={`${style.card} p-4 sm:p-5 ${className}`} {...props}>{children}</section>;
}

export function SectionHeading({ title, subtitle, action, style }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className={`text-base font-semibold ${style.headingText}`}>{title}</h2>
        {subtitle && <p className={`mt-1 text-xs ${style.secondaryText}`}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, note, icon: Icon, tone = "blue", style }) {
  const tones = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    green: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  };
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`${style.card} flex min-h-32 min-w-0 flex-col justify-between p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold uppercase tracking-wide ${style.secondaryText}`}>{label}</p>
          <p className={`mt-2 truncate text-2xl font-bold tracking-tight sm:text-3xl ${style.headingText}`} title={String(value)}>{value}</p>
        </div>
        <span className={`shrink-0 rounded-xl p-2.5 ${tones[tone]}`} aria-hidden="true"><Icon size={19} /></span>
      </div>
      {note && <p className={`mt-3 line-clamp-2 break-words text-xs leading-5 ${style.mutedText}`} title={note}>{note}</p>}
    </motion.article>
  );
}

export function TabButton({ active, children, onClick, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg px-3 py-2 text-sm transition ${active
        ? "bg-blue-100 font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
        : `${style.secondaryText} ${style.hoverBg}`}`}
    >
      {children}
    </button>
  );
}

export function StatusBadge({ children, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    green: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300",
    red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function ProgressBar({ value, style, tone = "blue" }) {
  const colors = {
    blue: "bg-blue-600 dark:bg-blue-500",
    green: "bg-green-600 dark:bg-green-500",
    purple: "bg-purple-600 dark:bg-purple-500",
    orange: "bg-orange-500",
  };
  return (
    <div className={`h-2 overflow-hidden rounded-full ${style.grayBg2}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export function FormField({ label, style, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className={`mb-1.5 block text-sm font-medium ${style.primaryText}`}>{label}</span>
      {children}
    </label>
  );
}

const stages = [
  { key: "applied", label: "Applied", filter: "Applied", color: "bg-blue-300 dark:bg-blue-800" },
  { key: "underReview", label: "Under review", filter: "Screening", color: "bg-blue-400 dark:bg-blue-700" },
  { key: "interview", label: "Interview", filter: "Interview", color: "bg-blue-500 dark:bg-blue-600" },
  { key: "offer", label: "Offer", filter: "Offer", color: "bg-blue-700 dark:bg-blue-400" },
];

const emptyApplications = [];
const emptyResumes = [];

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
      <header className="mb-6 flex items-center justify-between gap-6" aria-label="Dashboard">
        <div className="w-full max-w-md space-y-3">
          <div className="h-8 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </header>
    );
  }

  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className={`mb-1 text-xs font-semibold uppercase tracking-[0.16em] ${style.mutedText}`}>Applora</p>
        <h1 className={`text-2xl font-semibold tracking-tight sm:text-3xl ${style.primaryText}`}>
          {greeting}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className={`mt-1 text-sm ${style.secondaryText}`}>{summary}</p>
      </div>
      {showAction && (
        <Link
          to="/applications?add=true"
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium ${style.buttonBlue}`}
        >
          <BadgePlus size={18} />
          Add Application
        </Link>
      )}
    </header>
  );
}



function StatsStrip({ stats, style, loading }) {
  if (loading) {
    return <section aria-label="Loading application statistics" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />)}</section>;
  }

  const metrics = [
    { label: "Applications", value: stats.total, href: "/applications", definition: "All non-archived applications.", note: "In your tracker" },
    { label: "Awaiting response", value: stats.awaitingResponse, href: "/applications?status=Applied", definition: "Applications currently in Applied status.", note: "Waiting to hear back" },
    { label: "Interviews", value: stats.interviews, href: "/applications?status=interviews", definition: "Scheduled interviews on or after today.", note: `${stats.interviewsThisWeek} in the next 7 days` },
    { label: "Offers", value: stats.offers, href: "/applications?status=Offer", definition: "Applications with an Offer status.", note: "Offers received" },
  ];

  return (
   <section
      aria-label="Job search overview"
      className="mb-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4"
    >
      {metrics.map((metric) => {
        return (
          <Link
            key={metric.label}
            to={metric.href}
            title={metric.definition}
            aria-label={`${metric.label}: ${metric.value}. ${metric.definition}`}
            className={`group min-w-0 rounded-md border px-3 py-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-5 sm:py-4 lg:px-6 lg:py-5 xl:px-8 xl:py-6 ${style.card} ${style.border}`}
          >
            <span
              className={`block text-xl font-semibold tabular-nums tracking-tight sm:text-2xl ${style.primaryText}`}
            >
              {metric.value}
            </span>
            <span
              className={`mt-2 uppercase block text-xs  leading-snug${style.secondaryText} line-clamp-2 sm:truncate`}
            >
              {metric.label}
            </span>
          </Link>
        );
      })}
    </section>
  );
}

function PipelineBar({ counts, total, style, loading }) {
  if (loading) {
    return <section aria-label="Loading application pipeline" className="mb-6 space-y-3 rounded-2xl border p-5"><div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /><div className="h-3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /></section>;
  }

  const pipelineStages = [
    ...stages.filter(({ key }) => counts[key] > 0),
    ...(counts.rejected ? [{ key: "rejected", label: "Rejected", filter: "Rejected", color: "bg-red-500" }] : []),
    ...(counts.withdrawn ? [{ key: "withdrawn", label: "Withdrawn", filter: "Withdrawn", color: "bg-slate-400 dark:bg-slate-500" }] : []),
  ];

  return (
    <section aria-labelledby="pipeline-title" className={`mb-6 rounded-md border p-5 sm:p-6 ${style.card} ${style.border}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="pipeline-title" className={`text-base sm:text-lg font-semibold ${style.primaryText}`}>Application pipeline</h2>
          <p className={`mt-1 text-xs ${style.secondaryText}`}>A snapshot of where each application stands.</p>
        </div>
        <Link to="/applications" aria-label="View all applications" className={`inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200`}>
          <SquareArrowOutUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {total ? (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="group" aria-label="Applications by stage">
            {pipelineStages.map((stage) => (
              <Link
                key={stage.key}
                to={`/applications?status=${encodeURIComponent(stage.filter)}`}
                aria-label={`${stage.label}: ${counts[stage.key]}`}
                title={`${stage.label}: ${counts[stage.key]}`}
                className={`${stage.color} transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
                style={{ width: `${(counts[stage.key] / total) * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
            {pipelineStages.map((stage) => (
              <Link
                key={stage.key}
                to={`/applications?status=${encodeURIComponent(stage.filter)}`}
                className={`inline-flex items-center gap-2 text-xs ${style.secondaryText} hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-blue-300`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${stage.color}`} aria-hidden="true" />
                {stage.label}
                <span className={`font-semibold tabular-nums ${style.primaryText}`}>{counts[stage.key]}</span>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className={`rounded-xl border border-dashed px-4 py-5 text-sm ${style.border} ${style.secondaryText}`}>
          Your application stages will appear here. <Link to="/applications?add=true" className="font-semibold text-blue-700 hover:underline dark:text-blue-300">Add your first application</Link>
        </div>
      )}
    </section>
  );
}

function ResumeOverview({ resumes, style, loading }) {
  if (loading) {
    return <section aria-label="Loading resume library" className="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />;
  }
  const latestResume = [...resumes]
    .sort((left, right) => new Date(right.uploadedAt || 0) - new Date(left.uploadedAt || 0))[0];
  const uploadedAt = latestResume?.uploadedAt ? new Date(latestResume.uploadedAt) : null;
  const uploadedDate = uploadedAt && !Number.isNaN(uploadedAt.getTime())
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(uploadedAt)
    : "Upload date unavailable";

  return (
    <section className={`rounded-md border p-5 sm:p-6 ${style.card} ${style.border}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className={`text-lg font-semibold ${style.primaryText}`}>Resume library</h2>
        <Link 
          to="/resume" 
          aria-label="View all resumes"
          className={`rounded-sm ${style.secondaryText} hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-blue-300`}
        >
          <SquareArrowOutUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {latestResume ? (
        <>
          <p className={`truncate text-sm ${style.secondaryText}`} title={latestResume.fileName || "Filename unavailable"}>{latestResume.fileName || "Filename unavailable"}</p>
          <p className={`mt-2 text-xs ${style.mutedText}`}>{resumes.length} saved resume{resumes.length === 1 ? "" : "s"} · Uploaded {uploadedDate}</p>
        </>
      ) : (
        <>
          <p className={`mt-1 text-sm ${style.secondaryText}`}>Keep tailored versions ready for each opportunity.</p>
          <Link to="/resume" className="mt-3 inline-flex text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300">Add a resume</Link>
        </>
      )}
    </section>
  );
}

function UpcomingInterviews({ interviews, style, loading }) {
  if (loading) {
    return <section aria-label="Loading upcoming interviews" className={`space-y-4 rounded-2xl border p-5 ${style.card} ${style.border}`}><div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /><div className="h-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /><div className="h-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /></section>;
  }

  return (
    <section aria-labelledby="upcoming-title" className={`min-w-0 rounded-md border p-5 sm:p-6 ${style.card} ${style.border}`}>
      <div className="mb-8 flex items-center justify-between gap-3">
        <div>
          <h2 id="upcoming-title" className={`text-lg sm:text-xl font-semibold ${style.primaryText}`}>Upcoming interviews</h2>
          <p className={`mt-1 text-xs sm:text-sm ${style.secondaryText}`}>Your next scheduled conversations.</p>
        </div>
        <Link
          to="/interviews"
          aria-label="View all interviews"
          className={`rounded-sm ${style.secondaryText} hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-blue-300`}
        >
          <SquareArrowOutUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {interviews.length ? (
        <div className="divide-y divide-slate-200 dark:divide-white/10">
          {interviews.map((interview) => {
            return (
              <Link
                key={`${interview.applicationId}-${interview.date}`}
                to={`/applications/${encodeURIComponent(interview.applicationId)}`}
                className={`group flex min-w-0 items-center gap-3 rounded-lg py-3 transition-colors hover:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-white/5 sm:px-2`}
              >
                <span className={`px-4 py-2 rounded shrink-0 text-center ${style.blueBg2}`}>
                  <span className={`block text-[10px] font-semibold uppercase tracking-wide ${style.primaryText}`}>{formatExactDate(interview.date, { month: "short" })}</span>
                  <span className={`block text-lg font-semibold tabular-nums leading-5 ${style.primaryText}`}>{formatExactDate(interview.date, { day: "2-digit" })}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-medium ${style.primaryText}`}>{interview.company}</span>
                  <span className={`mt-0.5 block truncate text-xs ${style.secondaryText}`}>{interview.role}</span>
                </span>
                <span className={`hidden shrink-0 text-xs ${style.secondaryText} sm:block`}>
                  {formatTime(interview.time)}
                  {interview.type ? ` · ${interview.type} interview` : ""}
                </span>
                <span className={`hidden max-w-32 truncate text-right text-xs ${style.mutedText} md:block`}>
                  {interview.location || interview.format || "Location not set"}
                </span>
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

function RecentActivity({ activity, style, loading }) {
  if (loading) {
    return <section aria-label="Loading recent activity" className={`space-y-4 rounded-md border p-5 ${style.card} ${style.border}`}><div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />)}</section>;
  }

  return (
    <section aria-labelledby="recent-title" className={`min-w-0 rounded-md border p-5 sm:p-6 ${style.card} ${style.border}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="recent-title" className={`text-base font-semibold ${style.primaryText}`}>Recent activity</h2>
        <Link 
          to="/applications" 
          aria-label="View applications"
          className={`rounded-sm ${style.secondaryText} hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-blue-300`}
        >
          <SquareArrowOutUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {activity.length ? (
        <ul className={`divide-y ${style.divide}`}>
          {activity.map((item) => (
            <li key={item.id}>
              <Link to={item.href} className={`flex items-start justify-between gap-4 py-3 ${style.secondaryText} hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-blue-300`}>
                <span className={`min-w-0 text-sm ${style.primaryText}`}>{item.message}</span>
                <time dateTime={item.createdAt} className="shrink-0 text-xs">{relativeDate(item.createdAt)}</time>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`py-4 text-sm ${style.secondaryText}`}>Activity will appear here as you update your applications and resumes.</p>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const style = useStyle();
  const context = useOutletContext() || {};
  const { user } = useAuth();
  const loading = !Array.isArray(context.applications) || !Array.isArray(context.resumes);
  const applications = context.applications || emptyApplications;
  const resumes = context.resumes || emptyResumes;
  const stats = useMemo(() => getDashboardStats(applications, new Date(), resumes), [applications, resumes]);
  const firstName = user?.firstName?.trim();
  const summary = `${stats.interviewsThisWeek} interview${stats.interviewsThisWeek === 1 ? "" : "s"} in the next 7 days`;

  if (context.workspaceError) {
    return <section className={`mx-auto max-w-xl rounded-xl border p-8 text-center ${style.border} ${style.secondaryBg}`} role="alert"><h1 className={`text-lg font-semibold ${style.primaryText}`}>Dashboard data could not be loaded.</h1><p className={`mt-2 text-sm ${style.secondaryText}`}>{context.workspaceError}</p><button type="button" onClick={context.loadWorkspace} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">Try again</button></section>;
  }

  if (!loading && stats.total === 0 && resumes.length === 0) {
    return (
      <div className={`mx-auto w-full max-w-7xl dashboard-fade-in ${style.primaryText}`}>
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
          <Link to="/resume" className={`ml-3 text-sm font-medium ${style.blueText}`}>Set up your resume library</Link>
        </section>
      </div>
    );
  }

  return (
    <div className={`mx-auto w-full max-w-7xl dashboard-fade-in ${style.primaryText}`}>
      <DashboardHeader
        firstName={firstName}
        summary={summary}
        style={style}
        loading={loading}
        showAction={stats.total > 0 || resumes.length > 0}
      />
      <StatsStrip stats={stats} style={style} loading={loading} />
      <PipelineBar counts={stats.counts} total={stats.total} style={style} loading={loading} />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.8fr)]">
        <UpcomingInterviews interviews={stats.upcomingInterviews.slice(0, 5)} style={style} loading={loading} />
        <div className="space-y-5">
          <ResumeOverview resumes={resumes} style={style} loading={loading} />
          <RecentActivity activity={stats.recentActivity} style={style} loading={loading} />
        </div>
      </div>
    </div>
  );
}
