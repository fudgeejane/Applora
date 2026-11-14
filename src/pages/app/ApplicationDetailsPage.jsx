import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  ArrowDownToLine, ArrowUpRight, BriefcaseBusiness, CalendarDays, Check,
  ChevronDown, ChevronRight, FileText, Link2, Mail, MapPin,
  MonitorPlay, MoreHorizontal, Phone, Video,
} from "lucide-react";
import toast from "react-hot-toast";
import { StatusBadge } from "./DashboardPage";
import { useStyle } from "../../components/ui/Style";
import ApplicationModal from "../../components/modal/ApplicationModal";
import DeleteApplicationModal from "../../components/modal/DeleteApplicationModal";
import Portal from "../../components/ui/Portal";
import api from "../../lib/api";
import { uploadResume } from "../../lib/resumes";

const applicationStatuses = [
  "Applied", "Screening", "Interview", "Offer", "Rejected",
];

const statusTones = {
  Applied: "blue",
  Screening: "orange",
  Interview: "purple",
  Offer: "green",
  Rejected: "red",
};

const progressStatuses = ["Applied", "Screening", "Interview", "Offer"];

function localDate(value) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function formatLongDate(value) {
  const date = localDate(value);
  return date
    ? new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(date)
    : value || "—";
}

function formatRelativeDate(value) {
  const date = localDate(value);
  if (!date) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((date - today) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "in 1 day";
  if (days > 1) return `in ${days} days`;
  if (days === -1) return "1 day ago";
  if (days > -7) return `${Math.abs(days)} days ago`;
  const weeks = Math.floor(Math.abs(days) / 7);
  if (weeks < 5) return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  const months = Math.floor(Math.abs(days) / 30);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;
  const years = Math.floor(Math.abs(days) / 365);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

function cardClass(style, extra = "") {
  return `rounded-md border p-5 sm:p-6 ${style.border} ${style.secondaryBg} ${extra}`;
}

function StatusMenu({ status, onChange, style }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    wrapperRef.current?.querySelector('[aria-checked="true"]')?.focus();
    const closeOnOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Application status: ${status}. Change status`}
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex items-center gap-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <StatusBadge tone={statusTones[status] || "gray"}>{status}</StatusBadge>
        <ChevronDown size={14} className={style.mutedText} />
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label="Change application status"
          onKeyDown={(event) => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const options = [...event.currentTarget.querySelectorAll('[role="menuitemradio"]')];
            const current = options.indexOf(document.activeElement);
            const next = event.key === "Home" ? 0
              : event.key === "End" ? options.length - 1
                : (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
            options[next]?.focus();
          }}
          className={`absolute left-0 top-full z-30 mt-2 min-w-44 rounded-md border p-1 shadow-xl ${style.border} ${style.secondaryBg}`}
        >
          {applicationStatuses.map((item) => (
            <button
              key={item}
              type="button"
              role="menuitemradio"
              aria-checked={status === item}
              onClick={() => {
                setIsOpen(false);
                if (item !== status) onChange(item);
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm ${style.primaryText} ${style.hoverBg} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
            >
              <StatusBadge tone={statusTones[item]}>{item}</StatusBadge>
              {status === item && <Check size={14} className="ml-auto text-blue-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ApplicationHeader({
  application, style, onStatusChange, onEdit, onMenu, onCloseMenu, actionsOpen,
  onDuplicate, onArchive, onDelete,
}) {
  const actionMenuRef = useRef(null);
  const actionTriggerRef = useRef(null);
  const jobUrl = safeHttpUrl(application.jobUrl || application.url);
  const isUpcoming = localDate(application.dateApplied) > new Date(new Date().setHours(0, 0, 0, 0));
  const salaryMin = application.salaryMin && Number(application.salaryMin).toLocaleString();
  const salaryMax = application.salaryMax && Number(application.salaryMax).toLocaleString();
  const salary = salaryMin || salaryMax
    ? `${application.salaryCurrency || "PHP"} ${salaryMin && salaryMax ? `${salaryMin} – ${salaryMax}` : salaryMin || salaryMax}${application.salaryPeriod ? ` / ${application.salaryPeriod}` : ""}`
    : null;

  useEffect(() => {
    if (!actionsOpen) return undefined;
    actionMenuRef.current?.querySelector('[role="menuitem"]')?.focus();
    const closeOnOutsideClick = (event) => {
      if (!actionMenuRef.current?.contains(event.target)) onCloseMenu();
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        onCloseMenu();
        actionTriggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [actionsOpen, onCloseMenu]);

  return (
    <header className={cardClass(style, "mb-5")}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className={`text-2xl font-semibold tracking-tight sm:text-3xl ${style.primaryText}`}>{application.role}</h1>
            <StatusMenu status={application.status} onChange={onStatusChange} style={style} />
          </div>
          <p className={`mt-2 text-base ${style.secondaryText}`}>{application.company}</p>
          <div className={`mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm ${style.secondaryText}`}>
            {application.location && <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{application.location}</span>}
            {application.workSetup && <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${style.grayBg} ${style.primaryText}`}>{application.workSetup}</span>}
            {salary && <span className="inline-flex items-center gap-1.5"><BriefcaseBusiness size={15} />{salary}</span>}
            {application.source && <span className="inline-flex items-center gap-1.5"><Link2 size={15} />{application.source}</span>}
          </div>
          {application.dateApplied && (
            <p title={formatLongDate(application.dateApplied)} className={`mt-3 text-xs ${isUpcoming ? "text-amber-600 dark:text-amber-400" : style.mutedText}`}>
              Applied {formatRelativeDate(application.dateApplied)}
              {isUpcoming && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Upcoming date</span>}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {jobUrl && (
            <a href={jobUrl} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium ${style.buttonBlue} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}>
              Open job posting <ArrowUpRight size={15} />
            </a>
          )}
          <button 
            type="button" 
            onClick={onEdit} 
            className={`text-sm px-4 py-2 rounded-md text-sm ${style.buttonGray}`}
            >
            Edit application
          </button>
          <div className="relative" ref={actionMenuRef}>
            <button ref={actionTriggerRef} type="button" aria-label="More application actions" aria-haspopup="menu" aria-expanded={actionsOpen} onClick={onMenu} className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${style.border} ${style.primaryText} ${style.hoverBg}`}>
              <MoreHorizontal size={18} />
            </button>
            {actionsOpen && (
              <div role="menu" aria-label="Application actions" onKeyDown={(event) => {
                if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const options = [...event.currentTarget.querySelectorAll('[role="menuitem"]')];
                const current = options.indexOf(document.activeElement);
                const next = event.key === "Home" ? 0
                  : event.key === "End" ? options.length - 1
                    : (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
                options[next]?.focus();
              }} className={`absolute right-0 top-full z-30 mt-2 w-48 rounded-md border p-1 shadow-xl ${style.border} ${style.secondaryBg}`}>
                <button type="button" role="menuitem" onClick={onDuplicate} className={`w-full rounded-md px-3 py-2 text-left text-sm ${style.primaryText} ${style.hoverBg} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}>Duplicate</button>
                <button type="button" role="menuitem" onClick={onArchive} className={`w-full rounded-md px-3 py-2 text-left text-sm ${style.primaryText} ${style.hoverBg} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}>Archive</button>
                <button type="button" role="menuitem" onClick={onDelete} className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-400">Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function StatusStepper({ status, style }) {
  const terminal = status === "Rejected";
  const currentIndex = progressStatuses.indexOf(status);
  return (
    <section aria-label="Application progress" className={cardClass(style, "mb-5")}>
      {terminal ? (
        <div className={`flex items-center gap-3 rounded-md border p-3 ${status === "Rejected" ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300" : `${style.border} ${style.grayBg} ${style.secondaryText}`}`}>
          <span className="h-2.5 w-2.5 rounded-full bg-current" />
          <p className="text-sm font-semibold">{status === "Rejected" ? "Application rejected" : "Application withdrawn"}</p>
          <span className="text-sm">· This application has reached a terminal stage.</span>
        </div>
      ) : (
        <>
          <ol className="grid gap-3 sm:grid-cols-4 sm:gap-0">
            {progressStatuses.map((step, index) => {
              const active = index === currentIndex;
              const complete = currentIndex > index;
              const reached = currentIndex >= index;
              return (
                <li key={step} aria-current={active ? "step" : undefined} className="relative flex items-center gap-3 sm:flex-col sm:gap-2">
                  {index < progressStatuses.length - 1 && <span aria-hidden="true" className={`absolute left-[13px] top-7 h-[calc(100%+0.75rem)] w-0.5 sm:left-[calc(50%+14px)] sm:top-[13px] sm:h-0.5 sm:w-[calc(100%-28px)] ${complete ? "bg-blue-600" : style.isDarkMode ? "bg-[#333333]" : "bg-[#CCCCCC]"}`} />}
                  <span className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                    active ? "border-blue-600 bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-500/20"
                      : complete ? "border-blue-600 bg-blue-600 text-white"
                        : `${style.border} ${style.secondaryBg} ${style.mutedText}`
                  }`}>{complete ? <Check size={15} /> : index + 1}</span>
                  <span className={`text-sm ${active ? "font-semibold text-blue-700 dark:text-blue-300" : reached ? style.primaryText : style.mutedText}`}>{step}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}

function Detail({ label, children, style }) {
  return <div><dt className={`text-xs font-medium uppercase tracking-wide ${style.mutedText}`}>{label}</dt><dd className={`mt-1.5 break-words text-sm ${style.primaryText}`}>{children || "—"}</dd></div>;
}

export function DetailsCard({ application, style }) {
  const contact = application.contactName;
  const hasContact = contact || application.contactEmail || application.contactLinkedIn;
  return (
    <section className={cardClass(style)}>
      <h2 className={`text-base font-semibold ${style.primaryText}`}>Application details</h2>
      <dl className={`mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2`}>
        <Detail label="Date applied" style={style}>
          <span title={formatLongDate(application.dateApplied)}>{formatLongDate(application.dateApplied)}</span>
          {localDate(application.dateApplied) > new Date(new Date().setHours(0, 0, 0, 0)) && <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">Upcoming date</span>}
        </Detail>
        <Detail label="Employment type" style={style}>{application.employmentType}</Detail>
        <Detail label="Contact person" style={style}>
          {hasContact ? (
            <span className="flex flex-col gap-1">
              {contact && <span>{contact}</span>}
              {application.contactEmail && <a className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400" href={`mailto:${application.contactEmail}`}><Mail size={13} />{application.contactEmail}</a>}
              {safeHttpUrl(application.contactLinkedIn) && <a className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400" href={safeHttpUrl(application.contactLinkedIn)} target="_blank" rel="noreferrer"><Link2 size={13} />LinkedIn profile</a>}
            </span>
          ) : "—"}
        </Detail>
      </dl>
    </section>
  );
}

function inlineMarkdown(text) {
  const tokens = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^)]+\))/g;
  return text.split(tokens).filter(Boolean).map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index} className="rounded bg-black/5 px-1 dark:bg-white/10">{token.slice(1, -1)}</code>;
    if (token.startsWith("*") && token.endsWith("*")) return <em key={index}>{token.slice(1, -1)}</em>;
    const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer" className="text-blue-600 underline dark:text-blue-400">{link[1]}</a>;
    return token;
  });
}

function MarkdownNotes({ value, style }) {
  const lines = value.split(/\r?\n/);
  const blocks = [];
  let list = [];
  const flushList = () => {
    if (list.length) {
      blocks.push(<ul key={`list-${blocks.length}`} className="my-2 list-disc space-y-1 pl-5">{list.map((line, index) => <li key={index}>{inlineMarkdown(line)}</li>)}</ul>);
      list = [];
    }
  };
  lines.forEach((line) => {
    const trimmed = line.trim();
    const bullet = trimmed.match(/^[-*]\s+(.+)/);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }
    flushList();
    if (!trimmed) return;
    const heading = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (heading) {
      const Tag = heading[1].length === 1 ? "h3" : "h4";
      blocks.push(<Tag key={blocks.length} className={`my-2 font-semibold ${style.primaryText}`}>{inlineMarkdown(heading[2])}</Tag>);
    } else {
      blocks.push(<p key={blocks.length} className="my-2">{inlineMarkdown(trimmed)}</p>);
    }
  });
  flushList();
  return <div className={`break-words text-sm leading-6 ${style.secondaryText}`}>{blocks}</div>;
}

export function NotesCard({ notes, style, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(notes || "");
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = (notes || "").length > 700;
  const visibleNotes = isLong && !isExpanded ? notes.slice(0, 700).trimEnd() : notes;

  const save = () => {
    onSave(draft.trim());
    setIsEditing(false);
  };
  const startEditing = () => {
    setDraft(notes || "");
    setIsEditing(true);
  };

  return (
    <section className={cardClass(style)}>
      <div className="flex items-start justify-between gap-3">
        <div><h2 className={`text-base font-semibold ${style.primaryText}`}>Job description / notes</h2><p className={`mt-1 text-xs ${style.secondaryText}`}>Keep useful details and preparation notes here.</p></div>
        {!isEditing && notes && <button type="button" onClick={startEditing} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400">Edit notes</button>}
      </div>
      {isEditing ? (
        <div className="mt-4">
          <label htmlFor="application-notes" className="sr-only">Application notes in Markdown</label>
          <textarea id="application-notes" autoFocus maxLength={10000} rows={7} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add job details or notes. Basic Markdown is supported." className={`w-full resize-y rounded-md border px-3 py-2.5 text-sm ${style.input} ${style.inputFocus}`} />
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => { setDraft(notes || ""); setIsEditing(false); }} className={`rounded-md border px-3 py-2 text-sm ${style.border} ${style.secondaryText} ${style.hoverBg}`}>Cancel</button>
            <button type="button" onClick={save} className={`rounded-md px-3 py-2 text-sm font-medium ${style.buttonBlue}`}>Save notes</button>
          </div>
        </div>
      ) : notes ? (
        <div className="mt-3">
          <MarkdownNotes value={visibleNotes} style={style} />
          {isLong && <button type="button" onClick={() => setIsExpanded((expanded) => !expanded)} className="mt-2 text-sm font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400">{isExpanded ? "Show less" : "Show more"}</button>}
        </div>
      ) : (
        <div className={`mt-4 flex flex-col items-start gap-3 rounded-md border border-dashed p-4 ${style.border}`}>
          <p className={`text-sm ${style.secondaryText}`}>No job description or notes yet.</p>
          <button type="button" onClick={startEditing} className={`rounded-md px-3 py-2 text-sm font-medium ${style.buttonBlue} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}>Add notes</button>
        </div>
      )}
    </section>
  );
}

export function ResumeCard({ application, resumes, style, onAttach }) {
  const resume = resumes.find((item) => item.id === application.resumeId)
    || resumes.find((item) => (item.name || item.title) === application.resumeUsed);
  const resumeName = resume?.name || resume?.title || application.resumeUsed;
  return (
    <section className={cardClass(style)}>
      <div className="flex items-start gap-3">
        <span className={`rounded-md p-2.5 ${style.grayBg} ${style.secondaryText}`}><FileText size={19} /></span>
        <div className="min-w-0"><h2 className={`text-base font-semibold ${style.primaryText}`}>Resume used</h2><p className={`mt-1 text-xs ${style.secondaryText}`}>Resume associated with this application</p></div>
      </div>
      {resumeName ? (
        <div className={`mt-4 rounded-md border p-3.5 ${style.border}`}>
          <div className="flex items-start gap-2.5">
            <FileText size={16} className="mt-0.5 shrink-0 text-blue-500" />
            <div className="min-w-0"><p className={`break-words text-sm font-medium ${style.primaryText}`}>{resumeName}</p><p className={`mt-1 text-xs ${style.secondaryText}`}>{resume ? `${resume.occupation || "Occupation not specified"} · ${resume.fileName}` : "Previously recorded; this resume is no longer available"}</p></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {resume && <Link to={`/resume?resumeId=${encodeURIComponent(resume.id)}`} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium ${style.border} ${style.secondaryText} ${style.hoverBg}`}>Preview <ArrowUpRight size={13} /></Link>}
            {resume?.downloadUrl ? (
              <a href={resume.downloadUrl} download className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium ${style.border} ${style.secondaryText} ${style.hoverBg}`}>Download <ArrowDownToLine size={13} /></a>
            ) : (
              <button type="button" disabled title="A downloadable file is not available for this sample resume." className={`inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs opacity-50 ${style.border} ${style.secondaryText}`}>Download <ArrowDownToLine size={13} /></button>
            )}
          </div>
        </div>
      ) : (
        <div className={`mt-4 rounded-md border border-dashed p-4 ${style.border}`}>
          <p className={`text-sm ${style.secondaryText}`}>No resume is attached to this application.</p>
          <button type="button" onClick={onAttach} className={`mt-3 rounded-md px-3 py-2 text-sm font-medium ${style.buttonBlue}`}>Attach a resume</button>
        </div>
      )}
      <Link to="/resume" className={`mt-4 inline-flex items-center gap-1.5 text-sm font-medium ${style.blueText}`}>Manage resumes <ArrowUpRight size={14} /></Link>
    </section>
  );
}

export function InterviewCard({ application, style }) {
  const interview = application.interview;
  const query = new URLSearchParams({
    applicationId: application.id,
    role: application.role,
    company: application.company,
  }).toString();
  const downloadCalendar = () => {
    if (!interview?.date) return;
    const start = new Date(`${interview.date}T${interview.time || "09:00"}`);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + 45 * 60 * 1000);
    const toCalendarDate = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const escapeText = (text) => String(text || "").replace(/[,;\\]/g, "\\$&").replace(/\n/g, "\\n");
    const content = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Applora//Interview//EN", "BEGIN:VEVENT",
      `UID:${application.id}-${start.getTime()}@applora`,
      `DTSTAMP:${toCalendarDate(new Date())}`,
      `DTSTART:${toCalendarDate(start)}`, `DTEND:${toCalendarDate(end)}`,
      `SUMMARY:${escapeText(`Interview: ${application.role} at ${application.company}`)}`,
      `DESCRIPTION:${escapeText(interview.type || "Interview")}`,
      safeHttpUrl(interview.meetingLink) ? `URL:${safeHttpUrl(interview.meetingLink)}` : "",
      "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${application.id}-interview.ics`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className={cardClass(style)}>
      <div className="flex items-center gap-2"><CalendarDays size={17} className="text-purple-500" /><h2 className={`text-base font-semibold ${style.primaryText}`}>Upcoming interview</h2></div>
      {interview ? (
        <div className="mt-4 space-y-3">
          <p className={`text-sm font-medium ${style.primaryText}`}>{formatLongDate(interview.date)}{interview.time ? ` · ${interview.time}` : ""}</p>
          {interview.type && <p className={`flex items-center gap-2 text-sm ${style.secondaryText}`}><MonitorPlay size={15} />{interview.type}</p>}
          {interview.interviewer && <p className={`flex items-center gap-2 text-sm ${style.secondaryText}`}><Phone size={15} />{interview.interviewer}</p>}
          {safeHttpUrl(interview.meetingLink) && <a href={safeHttpUrl(interview.meetingLink)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline dark:text-blue-400"><Video size={15} />Open meeting link</a>}
          <button type="button" onClick={downloadCalendar} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${style.border} ${style.primaryText} ${style.hoverBg}`}><CalendarDays size={15} />Add to calendar</button>
        </div>
      ) : (
        <div className="mt-3">
          <p className={`text-sm ${style.secondaryText}`}>No interview has been scheduled yet.</p>
          <Link to={`/interviews?${query}`} className="mt-3 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white bg-blue-600 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><CalendarDays size={15} />Schedule interview</Link>
        </div>
      )}
    </section>
  );
}

export function ResumePicker({ resumes, style, onClose, onSelect }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.querySelector("button")?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const focusable = [...(dialogRef.current?.querySelectorAll("button:not([disabled]), a[href]") || [])];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <Portal>
    <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="resume-picker-title" className={`w-full max-w-lg rounded-md border p-5 ${style.border} ${style.secondaryBg}`}>
        <h2 id="resume-picker-title" className={`text-lg font-semibold ${style.primaryText}`}>Attach a resume</h2>
        <p className={`mt-1 text-sm ${style.secondaryText}`}>Choose a resume to associate with this application.</p>
        <div className="mt-4 space-y-2">
          {resumes.map((resume) => (
            <button key={resume.id} type="button" onClick={() => onSelect(resume)} className={`flex w-full items-center gap-3 rounded-md border p-3 text-left ${style.border} ${style.hoverBg} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}>
              <FileText size={18} className="shrink-0 text-blue-500" />
              <span className="min-w-0 flex-1"><span className={`block truncate text-sm font-medium ${style.primaryText}`}>{resume.name || resume.title || resume.fileName}</span><span className={`mt-1 block truncate text-xs ${style.secondaryText}`}>{resume.occupation || "Occupation not specified"} · {resume.fileName}</span></span>
              <ArrowUpRight size={15} className={style.mutedText} />
            </button>
          ))}
          {resumes.length === 0 && <p className={`rounded-md border border-dashed p-4 text-sm ${style.border} ${style.secondaryText}`}>No resumes are available. <Link to="/resume" onClick={onClose} className={style.blueText}>Manage resumes</Link></p>}
        </div>
        <div className="mt-5 flex justify-end"><button type="button" onClick={onClose} className={`rounded-md border px-3 py-2 text-sm ${style.border} ${style.secondaryText} ${style.hoverBg}`}>Cancel</button></div>
      </section>
    </div>
    </Portal>
  );
}

function Breadcrumbs({ current, style }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        <li><Link to="/dashboard" className={`rounded-sm ${style.secondaryText} transition hover:text-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}>Dashboard</Link></li>
        <li aria-hidden="true"><ChevronRight size={14} className={style.mutedText} /></li>
        <li><Link to="/applications" className={`rounded-sm ${style.secondaryText} transition hover:text-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}>Applications</Link></li>
        <li aria-hidden="true"><ChevronRight size={14} className={style.mutedText} /></li>
        <li aria-current="page" className={`max-w-[min(60vw,24rem)] truncate font-medium ${style.primaryText}`}>{current}</li>
      </ol>
    </nav>
  );
}

export default function ApplicationDetailsPage() {
  const style = useStyle();
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const outletContext = useOutletContext() || {};
  const applications = outletContext.applications;
  const setApplications = outletContext.setApplications;
  const resumes = Array.isArray(outletContext.resumes) ? outletContext.resumes : [];
  const setResumes = outletContext.setResumes;
  const isLoading = !Array.isArray(applications);
  const availableApplications = applications || [];
  const [isEditing, setIsEditing] = useState(false);
  const [isResumePickerOpen, setIsResumePickerOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const toggleActionsMenu = useCallback(() => setIsActionsOpen((open) => !open), []);
  const closeActionsMenu = useCallback(() => setIsActionsOpen(false), []);
  const application = availableApplications.find((item) => item.id === applicationId && !item.archived);

  const updateApplication = async (id, updater) => {
    const currentApplication = availableApplications.find((item) => item.id === id);
    if (!currentApplication) return null;
    try {
      const updated = updater(currentApplication);
      const response = await api.patch(`/applications/${encodeURIComponent(id)}`, updated);
      setApplications((current) => current.map((item) => item.id === id ? response.data.application : item));
      return response.data.application;
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update application. Please try again.");
      return null;
    }
  };

  const changeStatus = (status) => {
    void updateApplication(application.id, (current) => ({ ...current, status })).then((saved) => {
      if (saved) toast.success(`Status changed to ${status}.`);
    });
  };

  const saveApplication = async (updated) => {
    try {
      const response = await api.patch(`/applications/${encodeURIComponent(updated.id)}`, updated);
      setApplications((current) => current.map((item) => item.id === updated.id ? response.data.application : item));
      setIsEditing(false);
      toast.success("Application saved.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save application. Please try again.");
    }
  };

  const uploadResumeForApplication = async (file, name, occupation) => {
    const resume = await uploadResume(file, { name, occupation });
    setResumes((current) => [resume, ...(current || [])]);
    return resume;
  };

  const saveNotes = async (notes) => {
    if (await updateApplication(application.id, (current) => ({ ...current, notes }))) toast.success("Notes saved.");
  };

  const duplicateApplication = () => {
    const duplicate = {
      ...application,
      id: `application-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: "Applied",
      dateApplied: "",
      interview: undefined,
      archived: false,
    };
    api.post("/applications", duplicate).then(({ data }) => {
      setApplications((current) => [data.application, ...current]);
      toast.success("Application duplicated.");
      navigate(`/applications/${encodeURIComponent(data.application.id)}`);
    }).catch((error) => toast.error(error.response?.data?.message || "Unable to duplicate application."));
  };

  const archiveApplication = () => {
    void updateApplication(application.id, (current) => ({ ...current, archived: true })).then((saved) => {
      if (saved) { toast.success("Application archived."); navigate("/applications"); }
    });
  };

  const deleteApplication = () => {
    api.delete(`/applications/${encodeURIComponent(application.id)}`).then(() => {
      setApplications((current) => current.filter((item) => item.id !== application.id));
      setIsDeleteOpen(false);
      toast.success("Application deleted.");
      navigate("/applications");
    }).catch((error) => toast.error(error.response?.data?.message || "Unable to delete application."));
  };

  const attachResume = (resume) => {
    void updateApplication(application.id, (current) => ({
      ...current,
      resumeId: resume.id,
      resumeUsed: resume.name || resume.title,
    })).then((saved) => {
      if (saved) { setIsResumePickerOpen(false); toast.success("Resume attached."); }
    });
  };

  if (isLoading) {
    return (
      <div aria-label="Loading application details" aria-busy="true" className="mx-auto w-full max-w-7xl animate-pulse space-y-5">
        <div className={`h-4 w-48 rounded ${style.grayBg}`} />
        <div className={`h-44 rounded-md border ${style.border} ${style.secondaryBg}`} />
        <div className={`h-20 rounded-md border ${style.border} ${style.secondaryBg}`} />
        <div className="grid gap-5 lg:grid-cols-2">
          <div className={`h-72 rounded-md border ${style.border} ${style.secondaryBg}`} />
          <div className={`h-72 rounded-md border ${style.border} ${style.secondaryBg}`} />
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <Breadcrumbs current="Application not found" style={style} />
        <section className={`mt-5 rounded-md border p-8 text-center ${style.border} ${style.secondaryBg}`}>
          <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${style.grayBg} ${style.secondaryText}`}><ChevronRight size={20} /></div>
          <h1 className={`mt-4 text-xl font-semibold ${style.primaryText}`}>Application not found</h1>
          <p className={`mt-2 text-sm ${style.secondaryText}`}>This application may have been removed or archived.</p>
          <Link to="/applications" className="mt-5 inline-flex rounded-md px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Back to applications</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <Breadcrumbs current={application.company} style={style} />
      <ApplicationHeader
        application={application}
        style={style}
        onStatusChange={changeStatus}
        onEdit={() => setIsEditing(true)}
        actionsOpen={isActionsOpen}
        onMenu={toggleActionsMenu}
        onCloseMenu={closeActionsMenu}
        onDuplicate={() => { setIsActionsOpen(false); duplicateApplication(); }}
        onArchive={() => { setIsActionsOpen(false); archiveApplication(); }}
        onDelete={() => { setIsActionsOpen(false); setIsDeleteOpen(true); }}
      />
      <StatusStepper status={application.status} style={style} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)]">
        <div className="min-w-0 space-y-5">
          <DetailsCard application={application} style={style} />
          <NotesCard notes={application.notes} style={style} onSave={saveNotes} />
        </div>
        <aside className="space-y-5 lg:sticky lg:top-5">
          <ResumeCard application={application} resumes={resumes.map((resume) => ({ ...resume, updated: new Date(resume.updatedAt).toLocaleDateString(), downloadUrl: `/api/resumes/${resume.id}/download` }))} style={style} onAttach={() => setIsResumePickerOpen(true)} />
          {application.status === "Interview" && <InterviewCard application={application} style={style} />}
        </aside>
      </div>

      {isEditing && (
        <ApplicationModal
          key={application.id}
          application={application}
          resumes={resumes}
          style={style}
          onClose={() => setIsEditing(false)}
          onSave={saveApplication}
          onResumeUploaded={uploadResumeForApplication}
        />
      )}
      {isResumePickerOpen && (
        <ResumePicker
          resumes={resumes}
          style={style}
          onClose={() => setIsResumePickerOpen(false)}
          onSelect={attachResume}
        />
      )}
      {isDeleteOpen && (
        <DeleteApplicationModal
          application={application}
          style={style}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={deleteApplication}
        />
      )}
    </div>
  );
}
