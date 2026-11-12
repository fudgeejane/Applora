import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft, ArrowRight, CalendarDays, ChevronDown, List, MapPin, MessageSquareText, Plus, Sparkles, X,
} from "lucide-react";
import { useStyle } from "../../components/ui/Style";
import { fieldIcons, getPlatformMeta } from "../../components/ui/interviewScheduleUtils";
import api from "../../lib/api";
import {
  SectionHeading, StatusBadge,
} from "./DashboardPage";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const interviewTypeOptions = ["Phone screen", "Technical", "HR", "Final", "Other"];
const interviewFormatOptions = ["Video", "Phone", "Onsite"];
const interviewPlatformOptions = ["Zoom", "Google Meet", "Teams", "Webex", "Other"];
const reminderOptions = ["15 minutes before", "1 hour before", "1 day before"];
const quickTimes = ["09:00", "10:00", "14:00", "15:30"];

function FormSection({ title, description, icon: Icon, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-[#2b2d30] dark:bg-[#1b1c1f]">
      <div className="mb-4 flex items-center gap-2.5">
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            <Icon size={15} />
          </div>
        )}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-[#d5d7db]">{title}</h3>
          {description && <p className="mt-1 text-xs text-gray-500 dark:text-[#8d9199]">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, required, error, children, helperText }) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-gray-700 dark:text-[#e7e9ee]">
        {label}
        {required && <span className="text-red-400">*</span>}
      </span>
      {children}
      {helperText && !error && <span className="mt-1.5 block text-[11px] text-gray-500 dark:text-[#8d9199]">{helperText}</span>}
      {error && <span className="mt-1.5 block text-[11px] text-red-600 dark:text-red-300">{error}</span>}
    </label>
  );
}

function SelectControl({ id, label, value, onChange, options, placeholder, icon: Icon, required, error, className = "" }) {
  return (
    <Field label={label} htmlFor={id} required={required} error={error}>
      <div className="relative">
        {Icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#9aa0aa]">
            <Icon size={15} />
          </span>
        )}
        <select
          id={id}
          aria-required={required}
          aria-invalid={Boolean(error)}
          value={value}
          onChange={onChange}
          className={`h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-[#34383d] dark:bg-[#202327] dark:text-[#edf1f7] ${Icon ? "pl-9" : "pl-3"} ${error ? "border-red-500/70" : ""} ${className}`}
          style={{ backgroundImage: "none" }}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {(options || []).map((option) => {
            if (typeof option === "string") return <option key={option} value={option}>{option}</option>;
            return <option key={option.value} value={option.value}>{option.label}</option>;
          })}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#9aa0aa]">
          <ChevronDown size={15} />
        </span>
      </div>
    </Field>
  );
}

function Toggle({ checked, onChange, label, helperText, name }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-[#2b2d30] dark:bg-[#181a1d]">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        name={name}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${checked ? "border-blue-500 bg-blue-500/90" : "border-gray-300 bg-gray-200 dark:border-[#4f535a] dark:bg-[#2a2d32]"}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-[#edf1f7]">{label}</p>
        {helperText && <p className="mt-1 text-xs text-gray-500 dark:text-[#8d9199]">{helperText}</p>}
      </div>
    </div>
  );
}

function InputWithIcon({ id, type = "text", value, onChange, placeholder, icon: Icon, required, error, ariaLabel, inputMode, min, max }) {
  return (
    <div className="relative">
      {Icon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#8d9199]">
          <Icon size={15} />
        </span>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-required={required}
        aria-invalid={Boolean(error)}
        inputMode={inputMode}
        min={min}
        max={max}
        className={`h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 transition placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-[#34383d] dark:bg-[#202327] dark:text-[#edf1f7] dark:placeholder:text-[#7e838d] ${Icon ? "pl-9" : "pl-3"} ${error ? "border-red-500/70" : ""}`}
      />
    </div>
  );
}

function TextareaWithIcon({ id, value, onChange, placeholder, icon: Icon, required, error, rows = 3 }) {
  return (
    <div className="relative">
      {Icon && (
        <span className="pointer-events-none absolute left-3 top-3 text-gray-400 dark:text-[#8d9199]">
          <Icon size={15} />
        </span>
      )}
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-required={required}
        aria-invalid={Boolean(error)}
        className={`w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 transition placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-[#34383d] dark:bg-[#202327] dark:text-[#edf1f7] dark:placeholder:text-[#7e838d] ${Icon ? "pl-9" : "pl-3"} ${error ? "border-red-500/70" : ""}`}
      />
    </div>
  );
}

function PlatformBadge({ value }) {
  const meta = getPlatformMeta(value);
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-medium ${meta.accent}`}>
      {value ? value.slice(0, 2).toUpperCase() : "L"}
      {meta.label}
    </span>
  );
}

function toDateOnly(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateLabel(value) {
  const date = toDateOnly(value);
  return date ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date) : "No date";
}

function formatMonthLabel(date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatTimeLabel(value) {
  if (!value) return "Time TBD";
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const clock = new Date();
  clock.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(clock);
}

function safeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function getInterviewStatus(interview) {
  const status = String(interview?.status || "upcoming").toLowerCase();
  if (status === "cancelled") return "cancelled";
  if (status === "completed" || ["Passed", "Rejected", "Offer", "No response"].includes(interview?.outcome)) return "completed";
  return "upcoming";
}

function getInterviewTone(status) {
  if (status === "completed") return "green";
  if (status === "cancelled") return "red";
  return "blue";
}

function getInterviewAccent(status) {
  if (status === "completed") return "border-green-500 text-green-700 dark:text-green-300";
  if (status === "cancelled") return "border-red-500 text-red-700 dark:text-red-300";
  return "border-blue-500 text-blue-700 dark:text-blue-300";
}

function readableCountdown(dateValue) {
  const base = toDateOnly(dateValue);
  if (!base) return "Date TBD";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(base);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - now) / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "in 1 day";
  if (diffDays > 1) return `in ${diffDays} days`;
  if (diffDays === -1) return "1 day ago";
  return `${Math.abs(diffDays)} days ago`;
}

function normalizeInterview(application) {
  if (!application || !application.interview || typeof application.interview !== "object") return null;
  const interview = application.interview;
  const date = interview.date || "";
  const time = interview.time || "";
  return {
    ...interview,
    id: interview.id || `${application.id}-interview`,
    applicationId: application.id,
    company: application.company || interview.company || "Company not set",
    role: application.role || interview.role || "Role not set",
    jobUrl: application.url || interview.jobUrl || "",
    location: application.location || interview.location || "",
    status: interview.status || "upcoming",
    outcome: interview.outcome || "Pending",
    type: interview.type || "Video call",
    format: interview.format || "Zoom",
    interviewer: interview.interviewer || "",
    interviewerEmail: interview.interviewerEmail || "",
    interviewerPhone: interview.interviewerPhone || "",
    meetingLink: interview.meetingLink || "",
    notes: interview.notes || "",
    questions: interview.questions || "",
    checklist: Array.isArray(interview.checklist) ? interview.checklist : [],
    reminder: Boolean(interview.reminder),
    reminderLeadTime: interview.reminderLeadTime || "1 hour before",
    thankYouSent: Boolean(interview.thankYouSent),
    date,
    time,
    statusLabel: getInterviewStatus(interview),
    dateTime: date && time ? new Date(`${date}T${time}:00`) : null,
    countdown: readableCountdown(date),
  };
}

function InterviewDrawer({ interview, style, onClose, onSave, onDelete, onPrepare }) {
  if (!interview) return null;

  const meetingUrl = safeUrl(interview.meetingLink);
  const statusLabel = getInterviewStatus(interview);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <aside className={`h-full w-full max-w-xl overflow-y-auto border-l p-5 shadow-2xl ${style.border} ${style.secondaryBg}`} role="dialog" aria-modal="true" aria-labelledby="interview-drawer-title">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 id="interview-drawer-title" className={`text-xl font-semibold ${style.primaryText}`}>{interview.company}</h2>
            <p className={`mt-1 ${style.secondaryText}`}>{interview.role}</p>
          </div>
          <button type="button" onClick={onClose} className={`rounded-md px-3 py-2 text-sm ${style.hoverBg} ${style.primaryText}`}>
            Close
          </button>
        </header>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => onPrepare(interview)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white ${style.buttonBlue}`}>
            <Sparkles size={15} /> Prepare with AI
          </button>
          {meetingUrl && (
            <a href={meetingUrl} target="_blank" rel="noreferrer" className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm ${style.border} ${style.primaryText}`}>
              Join meeting
            </a>
          )}
          <button type="button" onClick={() => onDelete(interview)} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:text-red-300">
            Remove
          </button>
        </div>

        <section className={`mt-5 space-y-3 rounded-xl border p-4 ${style.border} ${style.grayBg}`}>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={getInterviewTone(statusLabel)}>{statusLabel}</StatusBadge>
            <span className={`text-sm ${style.secondaryText}`}>{interview.type} · {interview.format}</span>
          </div>
          <p className={`text-sm ${style.primaryText}`}>
            <span className="font-medium">When:</span> {formatDateLabel(interview.date)} · {formatTimeLabel(interview.time)}
          </p>
          <p className={`text-sm ${style.secondaryText}`}>
            <span className="font-medium">Timezone:</span> Asia/Manila (UTC+8)
          </p>
          {interview.interviewer && (
            <p className={`text-sm ${style.secondaryText}`}>
              <span className="font-medium">Interviewer:</span> {interview.interviewer}
            </p>
          )}
          {interview.jobUrl && (
            <a href={safeUrl(interview.jobUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-300">
              View application
            </a>
          )}
          {interview.location && (
            <p className={`flex items-center gap-2 text-sm ${style.secondaryText}`}>
              <MapPin size={14} /> {interview.location}
            </p>
          )}
        </section>

        <div className="mt-5 space-y-4">
          <label className={`block text-sm font-medium ${style.primaryText}`}>
            Outcome
            <select
              value={interview.outcome || "Pending"}
              onChange={(event) => onSave({ ...interview, outcome: event.target.value, status: "completed" })}
              className={`mt-1 block w-full rounded-md border px-3 py-2 ${style.input} ${style.inputFocus}`}
            >
              <option>Pending</option>
              <option>Passed</option>
              <option>Rejected</option>
              <option>Offer</option>
              <option>No response</option>
            </select>
          </label>

          <label className={`flex items-center gap-2 text-sm ${style.secondaryText}`}>
            <input type="checkbox" checked={Boolean(interview.thankYouSent)} onChange={(event) => onSave({ ...interview, thankYouSent: event.target.checked })} />
            Thank-you sent
          </label>

          <label className={`block text-sm font-medium ${style.primaryText}`}>
            Notes
            <textarea rows={4} defaultValue={interview.notes || ""} onBlur={(event) => { if (event.target.value !== (interview.notes || "")) onSave({ ...interview, notes: event.target.value }); }} className={`mt-1 block w-full rounded-md border px-3 py-2 ${style.input} ${style.inputFocus}`} />
          </label>

          <label className={`block text-sm font-medium ${style.primaryText}`}>
            Questions to ask
            <textarea rows={3} defaultValue={interview.questions || ""} onBlur={(event) => { if (event.target.value !== (interview.questions || "")) onSave({ ...interview, questions: event.target.value }); }} className={`mt-1 block w-full rounded-md border px-3 py-2 ${style.input} ${style.inputFocus}`} />
          </label>

          <div>
            <h3 className={`text-sm font-semibold ${style.primaryText}`}>Prep checklist</h3>
            <div className="mt-2 space-y-2">
              {(interview.checklist || []).map((item, index) => (
                <label key={`${item.text}-${index}`} className={`flex items-center gap-2 text-sm ${style.secondaryText}`}>
                  <input type="checkbox" checked={Boolean(item.done)} onChange={(event) => {
                    const nextChecklist = (interview.checklist || []).map((entry, entryIndex) => entryIndex === index ? { ...entry, done: event.target.checked } : entry);
                    onSave({ ...interview, checklist: nextChecklist });
                  }} />
                  {item.text}
                </label>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function InterviewsPage() {
  const navigate = useNavigate();
  const style = useStyle();
  const [searchParams, setSearchParams] = useSearchParams();
  const { applications, setApplications } = useOutletContext();
  const applicationList = useMemo(() => (Array.isArray(applications) ? applications : []), [applications]);
  const applicationIdParam = searchParams.get("applicationId");
  const scheduleTriggerRef = useRef(null);
  const modalRef = useRef(null);
  const initialDraftRef = useRef(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedInterviewId, setSelectedInterviewId] = useState(null);
  const [view, setView] = useState("Calendar");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [platform, setPlatform] = useState("Zoom");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draft, setDraft] = useState(() => {
    const selectedApp = applicationList.find((item) => item.id === applicationIdParam);
    return {
      applicationId: selectedApp?.id || "",
      date: "",
      time: "",
      type: "Phone screen",
      format: "Video",
      interviewer: "",
      interviewerEmail: "",
      interviewerPhone: "",
      meetingLink: "",
      location: selectedApp?.location || "",
      notes: "",
      questions: "",
      checklist: [],
      outcome: "Pending",
      status: "upcoming",
      thankYouSent: false,
      reminder: false,
      reminderLeadTime: "1 hour before",
    };
  });

  const interviews = useMemo(
    () => applicationList
      .map((application) => normalizeInterview(application))
      .filter(Boolean)
      .sort((left, right) => {
        const leftTime = left.dateTime ? left.dateTime.getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.dateTime ? right.dateTime.getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      }),
    [applicationList],
  );

  const prefilledApplication = useMemo(
    () => applicationList.find((item) => item.id === applicationIdParam),
    [applicationIdParam, applicationList],
  );
  const activeApplications = applicationList.filter((item) => !item.archived && ["Applied", "Screening", "Under Review", "Interview"].includes(item.status));
  const awaitingInterview = applicationList.filter((item) => item.status === "Interview" && !item.interview);
  const selectedInterview = useMemo(
    () => (selectedInterviewId ? interviews.find((item) => item.id === selectedInterviewId) ?? null : null),
    [interviews, selectedInterviewId],
  );
  const isVideoFormat = draft.format === "Video";
  const isOnsiteFormat = draft.format === "Onsite";
  const isSaveDisabled = !draft.applicationId || !draft.date || !draft.time || isSaving || (isVideoFormat && !draft.meetingLink) || (isOnsiteFormat && !draft.location);

  useEffect(() => {
    setHasUnsavedChanges(JSON.stringify(draft) !== JSON.stringify(initialDraftRef.current || {}));
  }, [draft]);

  useEffect(() => {
    if (scheduleOpen && initialDraftRef.current === null) {
      initialDraftRef.current = JSON.parse(JSON.stringify(draft));
      setHasUnsavedChanges(false);
    }
  }, [scheduleOpen, draft]);

  const closeScheduleModal = useCallback((confirmDiscard = true) => {
    if (confirmDiscard && hasUnsavedChanges && !window.confirm("Discard your unsaved interview changes?")) return;
    setScheduleOpen(false);
    setErrors({});
    setHasUnsavedChanges(false);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("applicationId");
    setSearchParams(nextParams, { replace: true });
    if (scheduleTriggerRef.current) {
      scheduleTriggerRef.current.focus();
    }
    initialDraftRef.current = null;
  }, [hasUnsavedChanges, searchParams, setSearchParams]);

  useEffect(() => {
    if (!scheduleOpen) return;
    if (modalRef.current) {
      const firstField = modalRef.current.querySelector("select, input, textarea, button:not([disabled])");
      if (firstField) firstField.focus();
    }
  }, [scheduleOpen]);

  useEffect(() => {
    if (!scheduleOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeScheduleModal();
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        const form = document.getElementById("schedule-interview-form");
        if (form && !isSaveDisabled) form.requestSubmit();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeScheduleModal, isSaveDisabled, scheduleOpen]);

  const today = new Date();
  const todayKey = formatDateKey(today);

  const upcomingInterviews = interviews.filter((interview) => {
    if (getInterviewStatus(interview) !== "upcoming") return false;
    if (!interview.date) return false;
    const date = toDateOnly(interview.date);
    if (!date) return false;
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
    return date >= start && date <= end;
  });

  const visibleInterviews = useMemo(() => {
    if (view !== "List") return interviews;
    return [...interviews].sort((a, b) => (a.dateTime ? a.dateTime.getTime() : Number.MAX_SAFE_INTEGER) - (b.dateTime ? b.dateTime.getTime() : Number.MAX_SAFE_INTEGER));
  }, [interviews, view]);

  const firstDayOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const leadingDays = firstDayOfMonth.getDay();
  const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  const calendarCells = Array.from({ length: totalCells }, (_, index) => {
    const dateNumber = index - leadingDays + 1;
    const current = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), dateNumber);
    const key = formatDateKey(current);
    return {
      date: current,
      key,
      inMonth: current.getMonth() === calendarMonth.getMonth(),
      isToday: key === todayKey,
    };
  });

  const [expandedCells, setExpandedCells] = useState({});

  const openScheduleModal = (date = "", applicationId = "") => {
    scheduleTriggerRef.current = document.activeElement;
    const selectedApplication = applicationList.find((item) => item.id === applicationId)
      || prefilledApplication
      || activeApplications[0]
      || applicationList[0]
      || null;
    const nextDraft = {
      applicationId: selectedApplication?.id || "",
      date: date || "",
      time: "",
      type: "Phone screen",
      format: "Video",
      interviewer: "",
      interviewerEmail: "",
      interviewerPhone: "",
      meetingLink: "",
      location: selectedApplication?.location || "",
      notes: "",
      questions: "",
      checklist: [],
      outcome: "Pending",
      status: "upcoming",
      thankYouSent: false,
      reminder: false,
      reminderLeadTime: "1 hour before",
    };
    initialDraftRef.current = JSON.parse(JSON.stringify(nextDraft));
    setDraft(nextDraft);
    setErrors({});
    setIsSaving(false);
    const detectedPlatform = getPlatformMeta(nextDraft.meetingLink)?.label || "Zoom";
    setPlatform(detectedPlatform);
    setScheduleOpen(true);
  };

  const saveInterview = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!draft.applicationId) nextErrors.applicationId = "Please select an application.";
    if (!draft.date) nextErrors.date = "Choose a date.";
    if (!draft.time) nextErrors.time = "Choose a time.";
    if (isVideoFormat && !safeUrl(draft.meetingLink)) nextErrors.meetingLink = "Add a valid video meeting link or URL.";
    if (isOnsiteFormat && !draft.location) nextErrors.location = "Add the interview location or address.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Please complete the required fields before saving.");
      return;
    }

    setIsSaving(true);
    try {
      const { data } = await api.put(
        `/applications/${encodeURIComponent(draft.applicationId)}/interview`,
        draft,
      );
      setApplications((current) => current.map((item) => item.id === data.application.id ? data.application : item));
      toast.success("Interview saved.");
      closeScheduleModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save interview. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateInterview = async (applicationId, patch) => {
    const application = applicationList.find((item) => item.id === applicationId);
    if (!application?.interview) return;
    try {
      const { data } = await api.put(
        `/applications/${encodeURIComponent(applicationId)}/interview`,
        { ...application.interview, ...patch },
      );
      setApplications((current) => current.map((item) => item.id === applicationId ? data.application : item));
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update interview. Please try again.");
    }
  };

  const deleteInterview = async (interview) => {
    if (!interview?.applicationId) return;
    const application = applicationList.find((item) => item.id === interview.applicationId);
    if (!application) return;
    try {
      const status = application.status === "Interview" ? "Applied" : application.status;
      const { data } = await api.patch(`/applications/${encodeURIComponent(application.id)}`, { interview: null, status });
      setApplications((current) => current.map((item) => item.id === application.id ? data.application : item));
      setSelectedInterviewId(null);
      toast.success("Interview removed from this application.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to remove interview. Please try again.");
    }
  };

  const prepareForInterview = (interview) => {
    const prompt = `Help me prepare for my ${interview.role} interview at ${interview.company} on ${formatDateLabel(interview.date)}. My interview details are: ${interview.type}, ${interview.format}, and ${interview.location || "remote"}.`;
    navigate(`/ai-assistant?prompt=${encodeURIComponent(prompt)}`);
  };

  const groupedAgenda = useMemo(() => {
    const groups = {};
    for (const interview of visibleInterviews) {
      const dateKey = interview.date || "unscheduled";
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(interview);
    }
    return Object.entries(groups).sort(([left], [right]) => {
      if (left === "unscheduled") return 1;
      if (right === "unscheduled") return -1;
      return left.localeCompare(right);
    });
  }, [visibleInterviews]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className={`mb-1 text-2xl sm:text-3xl font-semibold ${style.primaryText}`}>Interview management</h1>
          <p className={`text-sm sm:text-base ${style.secondaryText}`}>Keep every conversation aligned with your applications and next steps.</p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-between gap-2 self-start sm:w-auto sm:shrink-0 sm:justify-normal sm:self-auto">
          <div className={`flex items-center gap-1 rounded-xl border p-1 ${style.border} ${style.grayBg}`} role="group" aria-label="Schedule view">
            <button
              type="button"
              onClick={() => setView("Calendar")}
              aria-label="Month view"
              aria-pressed={view === "Calendar"}
              title="Month view"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${view === "Calendar" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : `${style.secondaryText} ${style.hoverBg}`}`}
            >
              <CalendarDays size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setView("List")}
              aria-label="List view"
              aria-pressed={view === "List"}
              title="List view"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${view === "List" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : `${style.secondaryText} ${style.hoverBg}`}`}
            >
              <List size={18} aria-hidden="true" />
            </button>
          </div>
          <button type="button" onClick={() => openScheduleModal()} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium sm:px-4 ${style.buttonBlue}`}>
            <Plus size={17} aria-hidden="true" /> Schedule interview
          </button>
        </div>
      </div>

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(17rem,0.7fr)] lg:gap-6">
        <section aria-label="Interview schedule" className="min-w-0">
          {view === "Calendar" && (
            <div className={`mb-4 min-w-0 overflow-hidden rounded-md border ${style.border} ${style.secondaryBg}`}>
              <div className="flex items-center justify-center px-2 py-2 sm:px-4">
                <div className="inline-flex max-w-full items-center" role="group" aria-label="Month navigation">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.primaryText} ${style.hoverBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
                  >
                    <ArrowLeft size={16} />
                  </button>

                  <div className="min-w-36 px-3 text-center sm:min-w-44">
                    <span className={`text-sm font-semibold sm:text-base ${style.primaryText}`}>{formatMonthLabel(calendarMonth)}</span>
                  </div>

                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.primaryText} ${style.hoverBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
              <div className={`grid min-w-0 grid-cols-7 border-t ${style.border}`} role="group" aria-label="Monthly interview calendar">
              {weekdayLabels.map((day) => (
                <div key={day} className={`border-b border-r py-2 text-center text-[11px] font-medium ${style.border} ${style.secondaryText}`}>
                  {day}
                </div>
              ))}

              {calendarCells.map((cell) => {
                const dayInterviews = interviews.filter((interview) => interview.date === cell.key);
                const visibleEvents = dayInterviews.slice(0, 2);
                const hiddenCount = Math.max(0, dayInterviews.length - visibleEvents.length);
                return (
                  <div
                    key={cell.key}
                    title={`${formatDateLabel(cell.key)}${dayInterviews.length ? ` · ${dayInterviews.length} interviews` : ""}`}
                    className={`group relative min-h-20 min-w-0 border-b border-r p-1 transition-colors sm:min-h-28 sm:p-2 ${style.border} ${cell.inMonth ? style.secondaryBg : `${style.primaryBg} opacity-50`} ${cell.isToday ? "bg-blue-50/50 dark:bg-blue-500/5" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (dayInterviews.length) setSelectedInterviewId(dayInterviews[0].id);
                          else openScheduleModal(cell.key);
                        }}
                        aria-label={`${cell.isToday ? "Today, " : ""}${formatDateLabel(cell.key)}${dayInterviews.length ? `, ${dayInterviews.length} interviews` : ", schedule interview"}`}
                        className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs tabular-nums transition ${cell.isToday ? "bg-blue-600 font-semibold text-white" : `${style.secondaryText} ${style.hoverBg}`}`}
                      >
                        {cell.date.getDate()}
                      </button>
                      {cell.inMonth && (
                        <button
                          type="button"
                          aria-label={`Add interview for ${cell.key}`}
                          onClick={() => openScheduleModal(cell.key)}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-blue-600 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-300 dark:hover:bg-blue-500/10 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100`}
                        >
                          <Plus size={15} />
                        </button>
                        )}
                    </div>

                    <div className="mt-1 space-y-0.5">
                      {visibleEvents.map((interview) => {
                        const status = getInterviewStatus(interview);
                        return (
                          <button
                            key={interview.id}
                            type="button"
                            onClick={() => setSelectedInterviewId(interview.id)}
                            className={`block w-full truncate border-l-2 px-1.5 py-1 text-left text-[10px] leading-4 transition hover:bg-blue-500/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 sm:text-xs ${getInterviewAccent(status)}`}
                            title={`${formatTimeLabel(interview.time)} · ${interview.company} · ${interview.role} · ${status}`}
                          >
                            <span className="font-medium">{formatTimeLabel(interview.time)}</span>
                            <span className="hidden sm:inline"> · {interview.company}</span>
                          </button>
                        );
                      })}
                      {hiddenCount > 0 && (
                        <div className="relative">
                          <button
                            type="button"
                            aria-expanded={Boolean(expandedCells[cell.key])}
                            onClick={() => setExpandedCells((current) => ({ ...current, [cell.key]: !current[cell.key] }))}
                            className={`px-1.5 py-1 text-[10px] font-medium ${style.secondaryText} ${style.hoverBg}`}
                          >
                            +{hiddenCount} more
                          </button>
                          {expandedCells[cell.key] && (
                            <div className={`absolute left-0 top-full z-20 mt-1 min-w-44 rounded-lg border p-1 shadow-lg ${style.border} ${style.secondaryBg}`}>
                              {dayInterviews.slice(2).map((interview) => (
                                <button
                                  key={interview.id}
                                  type="button"
                                  onClick={() => setSelectedInterviewId(interview.id)}
                                  className={`block w-full truncate rounded-md px-2 py-1.5 text-left text-xs ${style.primaryText} ${style.hoverBg}`}
                                >
                                  {formatTimeLabel(interview.time)} · {interview.company}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          )}

          {view === "List" && (
            <div className={`border-t ${style.border}`}>
              {groupedAgenda.length ? groupedAgenda.map(([dateKey, entries]) => (
                <section key={dateKey} className={`border-b py-4 ${style.border}`}>
                  <h3 className={`mb-2 text-xs font-semibold ${style.secondaryText}`}>
                    {dateKey === "unscheduled" ? "No date" : formatDateLabel(dateKey)}
                  </h3>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {entries.map((interview) => (
                      <button
                        key={interview.id}
                        type="button"
                        onClick={() => setSelectedInterviewId(interview.id)}
                        className={`flex w-full min-w-0 items-center gap-3 py-3 text-left ${style.hoverBg}`}
                      >
                        <span className={`h-8 w-0.5 shrink-0 border-l-2 ${getInterviewAccent(getInterviewStatus(interview)).split(" ")[0]}`} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm font-medium ${style.primaryText}`}>{interview.company}</span>
                          <span className={`mt-0.5 block truncate text-xs ${style.secondaryText}`}>{interview.role} · {formatTimeLabel(interview.time)} · {interview.type}</span>
                        </span>
                        <StatusBadge tone={getInterviewTone(getInterviewStatus(interview))}>{getInterviewStatus(interview)}</StatusBadge>
                      </button>
                    ))}
                  </div>
                </section>
              )) : (
                <p className={`py-8 text-sm ${style.secondaryText}`}>No interviews are scheduled yet.</p>
              )}
            </div>
          )}
        </section>

        <aside className="grid min-w-0 grid-cols-1 gap-8 lg:pt-1">
          <section className={`min-w-0 rounded-md border p-4 shadow-sm sm:p-5 ${style.border} ${style.secondaryBg}`} aria-labelledby="coming-up-heading">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" aria-hidden="true">
                  <CalendarDays size={19} />
                </span>
                <div className="min-w-0">
                  <h2 id="coming-up-heading" className={`text-base font-semibold ${style.primaryText}`}>Coming up</h2>
                  <p className={`mt-0.5 text-xs ${style.secondaryText}`}>Scheduled over the next 2 weeks</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-blue-800 dark:bg-blue-500/15 dark:text-blue-200">
                {upcomingInterviews.length}
              </span>
            </div>
            {upcomingInterviews.length ? (
              <ul className="space-y-3">
                {upcomingInterviews.slice(0, 6).map((interview) => (
                  <li key={interview.id} className={`min-w-0 rounded-md border p-3 transition-colors sm:p-4 ${style.border} ${style.grayBg}`}>
                    <button type="button" onClick={() => setSelectedInterviewId(interview.id)} className="block w-full min-w-0 text-left focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                      <span className={`block break-words text-sm font-semibold leading-5 ${style.primaryText}`}>{interview.company}</span>
                      <span className={`mt-1 block break-words text-xs leading-5 ${style.secondaryText}`}>{interview.role}</span>
                      <span className={`mt-3 block text-xs font-semibold leading-5 ${style.primaryText}`}>{formatDateLabel(interview.date)} <span className={style.mutedText}>·</span> {formatTimeLabel(interview.time)}</span>
                      <span className={`mt-1 block break-words text-xs ${style.secondaryText}`}>{interview.type} <span aria-hidden="true">·</span> {interview.format}</span>
                    </button>
                    <div className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 ${style.border}`}>
                      {safeUrl(interview.meetingLink) && (
                        <a href={safeUrl(interview.meetingLink)} target="_blank" rel="noreferrer" className="min-h-8 inline-flex items-center text-xs font-medium text-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-300">Join meeting</a>
                      )}
                      <button type="button" onClick={() => prepareForInterview(interview)} className={`min-h-8 inline-flex items-center gap-1.5 text-xs font-medium ${style.secondaryText} hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}>
                        <Sparkles size={14} aria-hidden="true" />
                        Prepare
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={`rounded-xl border border-dashed p-5 text-center ${style.border}`}>
                <p className={`text-sm font-medium ${style.primaryText}`}>Nothing coming up</p>
                <p className={`mt-1 text-xs leading-5 ${style.secondaryText}`}>Add an interview and it will appear here.</p>
              </div>
            )}
          </section>

          {awaitingInterview.length > 0 && (
            <section aria-label="Applications awaiting interview scheduling">
              <SectionHeading title="Awaiting schedule" subtitle="Applications marked for an interview" style={style} />
              <ul className={`divide-y border-t ${style.border} ${style.divide}`}>
                {awaitingInterview.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openScheduleModal("", item.id)}
                      className={`flex w-full items-center justify-between gap-3 py-3 text-left ${style.hoverBg}`}
                    >
                      <span className="min-w-0">
                        <span className={`block truncate text-sm font-medium ${style.primaryText}`}>{item.role}</span>
                        <span className={`mt-0.5 block truncate text-xs ${style.secondaryText}`}>{item.company}</span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-blue-600 dark:text-blue-300">Schedule</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {scheduleOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeScheduleModal();
        }}>
          <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="schedule-interview-title" className={`relative max-h-[90vh] w-full max-w-5xl overflow-hidden shadow-2xl ${style.card}`}>
            <div className={`flex items-center justify-between gap-4 border-b px-4 py-4 sm:px-5 ${style.border}`}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0">
                  <h2 id="schedule-interview-title" className={`text-lg font-semibold ${style.primaryText}`}>Schedule interview</h2>
                  <p className={`mt-0.5 text-sm ${style.secondaryText}`}>Add the time and details for your next conversation.</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close schedule interview dialog"
                onClick={closeScheduleModal}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border ${style.border} ${style.secondaryText} ${style.hoverBg}`}
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[calc(90vh-118px)] overflow-y-auto">
              <div className="space-y-5 p-4 sm:p-5">
                <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-4 ${style.border}`}>
                  {(() => {
                    const app = applicationList.find((item) => item.id === draft.applicationId) || null;
                    return (
                      <>
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-semibold ${style.primaryText}`}>{app?.company || "Select an application"}</p>
                          <p className={`mt-0.5 truncate text-xs ${style.secondaryText}`}>{app?.role || "Role will appear here"}</p>
                        </div>
                        {app?.location && <p className={`flex items-center gap-1.5 text-xs ${style.secondaryText}`}><MapPin size={13} /> {app.location}</p>}
                      </>
                    );
                  })()}
                </div>

                <form id="schedule-interview-form" noValidate onSubmit={saveInterview} className="space-y-5">
                  <FormSection title="Application" icon={fieldIcons.user}>
                    <div className="space-y-3">
                      <SelectControl
                        id="application-select"
                        label="Application"
                        value={draft.applicationId}
                        onChange={(event) => {
                          const selected = applicationList.find((item) => item.id === event.target.value) || null;
                          setDraft((current) => ({
                            ...current,
                            applicationId: event.target.value,
                            location: event.target.value === current.applicationId ? current.location : selected?.location || "",
                            meetingLink: event.target.value === current.applicationId ? current.meetingLink : "",
                            interviewer: event.target.value === current.applicationId ? current.interviewer : "",
                            interviewerEmail: event.target.value === current.applicationId ? current.interviewerEmail : "",
                            interviewerPhone: event.target.value === current.applicationId ? current.interviewerPhone : "",
                          }));
                          setErrors((current) => ({ ...current, applicationId: undefined, meetingLink: undefined, location: undefined }));
                        }}
                        options={applicationList.map((item) => ({ value: item.id, label: `${item.company} · ${item.role}` }))}
                        placeholder="Select an application"
                        error={errors.applicationId}
                        required
                      />
                    </div>
                  </FormSection>

                  <div className="grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
                    <FormSection title="When" icon={fieldIcons.calendar}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Date" htmlFor="interview-date" required error={errors.date}>
                          <InputWithIcon
                            id="interview-date"
                            type="date"
                            value={draft.date}
                            onChange={(event) => {
                              setDraft((current) => ({ ...current, date: event.target.value }));
                              setErrors((current) => ({ ...current, date: undefined }));
                            }}
                            icon={fieldIcons.calendar}
                            required
                            error={errors.date}
                          />
                        </Field>
                        <Field label="Time" htmlFor="interview-time" required error={errors.time}>
                          <InputWithIcon
                            id="interview-time"
                            type="time"
                            value={draft.time}
                            onChange={(event) => {
                              setDraft((current) => ({ ...current, time: event.target.value }));
                              setErrors((current) => ({ ...current, time: undefined }));
                            }}
                            icon={fieldIcons.clock}
                            required
                            error={errors.time}
                          />
                        </Field>
                        <SelectControl
                          id="interview-type"
                          label="Interview type"
                          value={draft.type}
                          onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
                          options={interviewTypeOptions}
                          icon={fieldIcons.user}
                        />
                        <SelectControl
                          id="interview-format"
                          label="Format"
                          value={draft.format}
                          onChange={(event) => {
                            const nextFormat = event.target.value;
                            setDraft((current) => ({
                              ...current,
                              format: nextFormat,
                              location: nextFormat === "Onsite" ? current.location : "",
                              meetingLink: nextFormat === "Video" ? current.meetingLink : "",
                            }));
                            if (nextFormat === "Video") {
                              setPlatform("Zoom");
                            }
                          }}
                          options={interviewFormatOptions}
                          icon={fieldIcons.clock}
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {quickTimes.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setDraft((current) => ({ ...current, time }))}
                            className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium ${style.border} ${style.secondaryText} ${style.hoverBg}`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </FormSection>

                    <FormSection title="Interview details" icon={fieldIcons.clock}>
                      <div className="space-y-4">
                        <SelectControl
                          id="interview-outcome"
                          label="Outcome"
                          value={draft.outcome}
                          onChange={(event) => setDraft((current) => ({ ...current, outcome: event.target.value }))}
                          options={["Pending", "Passed", "Rejected", "Offer", "No response"]}
                        />

                        {isVideoFormat && (
                          <div className="space-y-3">
                            <Field label="Platform" htmlFor="meeting-platform">
                              <div className="relative">
                                <select
                                  id="meeting-platform"
                                  value={platform}
                                  onChange={(event) => setPlatform(event.target.value)}
                                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-[#34383d] dark:bg-[#202327] dark:text-[#edf1f7]"
                                >
                                  {interviewPlatformOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                                </select>
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#a8afb9]">
                                  <ChevronDown size={15} />
                                </span>
                              </div>
                            </Field>
                            <Field label="Meeting link" htmlFor="meeting-link" required error={errors.meetingLink}>
                              <div className="flex items-center gap-2">
                                <div className="flex-shrink-0">
                                  <PlatformBadge value={draft.meetingLink || platform} />
                                </div>
                                <div className="flex-1">
                                  <InputWithIcon
                                    id="meeting-link"
                                    type="url"
                                    value={draft.meetingLink}
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      setDraft((current) => ({ ...current, meetingLink: value }));
                                      const platformMeta = getPlatformMeta(value);
                                      setPlatform(platformMeta.label);
                                      setErrors((current) => ({ ...current, meetingLink: undefined }));
                                    }}
                                    icon={fieldIcons.link}
                                    placeholder="https://"
                                    required
                                    error={errors.meetingLink}
                                  />
                                </div>
                              </div>
                            </Field>
                          </div>
                        )}

                        {isOnsiteFormat && (
                          <Field label="Location or address" htmlFor="interview-location" required error={errors.location}>
                            <InputWithIcon
                              id="interview-location"
                              type="text"
                              value={draft.location}
                              onChange={(event) => {
                                setDraft((current) => ({ ...current, location: event.target.value }));
                                setErrors((current) => ({ ...current, location: undefined }));
                              }}
                              icon={fieldIcons.map}
                              placeholder="HQ, office address, or room"
                              required
                              error={errors.location}
                            />
                          </Field>
                        )}
                      </div>
                    </FormSection>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-2">
                    <FormSection title="Contact" icon={fieldIcons.user}>
                      <div className="space-y-4">
                        <Field label="Interviewer" htmlFor="interviewer-name">
                          <InputWithIcon
                            id="interviewer-name"
                            type="text"
                            value={draft.interviewer}
                            onChange={(event) => setDraft((current) => ({ ...current, interviewer: event.target.value }))}
                            icon={fieldIcons.user}
                            placeholder="Name"
                          />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Email" htmlFor="interviewer-email">
                            <InputWithIcon
                              id="interviewer-email"
                              type="email"
                              value={draft.interviewerEmail}
                              onChange={(event) => setDraft((current) => ({ ...current, interviewerEmail: event.target.value }))}
                              icon={fieldIcons.mail}
                              placeholder="name@company.com"
                            />
                          </Field>
                          <Field label="Phone" htmlFor="interviewer-phone">
                            <InputWithIcon
                              id="interviewer-phone"
                              type="tel"
                              value={draft.interviewerPhone}
                              onChange={(event) => setDraft((current) => ({ ...current, interviewerPhone: event.target.value }))}
                              icon={fieldIcons.phone}
                              placeholder="+63 ..."
                            />
                          </Field>
                        </div>
                      </div>
                    </FormSection>

                    <FormSection title="Notes & follow-up" icon={MessageSquareText}>
                      <div className="space-y-4">
                        <Field label="Notes" htmlFor="interview-notes">
                          <TextareaWithIcon
                            id="interview-notes"
                            value={draft.notes}
                            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                            icon={fieldIcons.link}
                            placeholder="Interview context, key metrics, and topics to discuss..."
                            rows={4}
                          />
                        </Field>
                        <Field label="Questions to ask" htmlFor="interview-questions">
                          <TextareaWithIcon
                            id="interview-questions"
                            value={draft.questions}
                            onChange={(event) => setDraft((current) => ({ ...current, questions: event.target.value }))}
                            placeholder="What should you ask?"
                            rows={4}
                          />
                        </Field>
                        <div className="space-y-3 pt-1">
                          <Toggle
                            checked={Boolean(draft.reminder)}
                            onChange={(value) => setDraft((current) => ({ ...current, reminder: value }))}
                            label="Reminder enabled"
                            helperText="Get a gentle nudge before the call."
                          />
                          {draft.reminder && (
                            <SelectControl
                              id="reminder-lead-time"
                              label="Remind me"
                              value={draft.reminderLeadTime}
                              onChange={(event) => setDraft((current) => ({ ...current, reminderLeadTime: event.target.value }))}
                              options={reminderOptions}
                              icon={fieldIcons.clock}
                            />
                          )}
                          <Toggle
                            checked={Boolean(draft.thankYouSent)}
                            onChange={(value) => setDraft((current) => ({ ...current, thankYouSent: value }))}
                            label="Thank-you sent"
                            helperText="Mark this once a follow-up note is sent."
                          />
                        </div>
                      </div>
                    </FormSection>
                  </div>
                </form>
              </div>
            </div>

            <footer className={`sticky bottom-0 border-t px-4 py-3 ${style.secondaryBg} ${style.border} sm:px-5`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className={`text-[11px] ${style.secondaryText}`}>Esc to close · Ctrl/Cmd + Enter to save</div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={closeScheduleModal} className={`rounded-lg border px-4 py-2.5 text-sm font-medium ${style.border} ${style.primaryText} ${style.hoverBg}`}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="schedule-interview-form"
                    disabled={isSaveDisabled}
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white transition ${isSaveDisabled ? "cursor-not-allowed bg-blue-500/40 text-blue-100/70" : "bg-blue-600 hover:bg-blue-500"}`}
                  >
                    {isSaving ? "Saving..." : "Save interview"}
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </div>
      )}

      {selectedInterview && (
        <InterviewDrawer
          interview={selectedInterview}
          style={style}
          onClose={() => setSelectedInterviewId(null)}
          onSave={(updated) => {
            updateInterview(updated.applicationId, { ...updated, status: getInterviewStatus(updated), outcome: updated.outcome || "Pending" });
            setSelectedInterviewId(updated.id);
          }}
          onDelete={(interviewToDelete) => deleteInterview(interviewToDelete)}
          onPrepare={(interviewToPrepare) => prepareForInterview(interviewToPrepare)}
        />
      )}
    </div>
  );
}
