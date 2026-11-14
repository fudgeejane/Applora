import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft, ArrowRight, CalendarDays, ChevronDown, Clock3, Link2, List, Mail, MapPin, BadgePlus, Phone, Plus, Sparkles, Trash2, UserRound, X,
} from "lucide-react";
import { useStyle } from "../../components/ui/Style";
import Portal from "../../components/ui/Portal";
import api from "../../lib/api";
import {
  SectionHeading, StatusBadge,
} from "./DashboardPage";

const fieldIcons = {
  calendar: CalendarDays,
  clock: Clock3,
  user: UserRound,
  mail: Mail,
  phone: Phone,
  link: Link2,
  map: MapPin,
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const interviewTypeOptions = ["Technical", "HR", "Final", "Other"];
const interviewPlatformOptions = ["Zoom", "Google Meet", "Teams", "Webex", "Phone", "On-site", "Other"];

function getQuestionItems(value) {
  return String(value || "").split(/\r?\n/).map((question) => question.trim()).filter(Boolean);
}

function getFormatForPlatform(value) {
  if (value === "On-site") return "Onsite";
  if (value === "Phone") return "Phone";
  return "Video";
}

function FormSection({ title, description, children }) {
  const style = useStyle();

  return (
    <section className={`border-b-2 pb-5 ${style.border}`}>
      <div className="mb-4 flex items-center gap-2.5">
        <div>
          <h3 className={`text-sm uppercase font-semibold ${style.primaryText}`}>{title}</h3>
          {description && <p className={`mt-1 text-xs ${style.secondaryText}`}>{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, required, error, children, helperText }) {
  const style = useStyle();

  return (
    <label htmlFor={htmlFor} className="block">
      <span className={`mb-1.5 flex items-center gap-1 text-[13px] font-medium ${style.primaryText}`}>
        {label}
        {required && <span className={style.redText}>*</span>}
      </span>
      {children}
      {helperText && !error && <span className={`mt-1.5 block text-[11px] ${style.secondaryText}`}>{helperText}</span>}
      {error && <span className={`mt-1.5 block text-[11px] ${style.redText}`}>{error}</span>}
    </label>
  );
}

function SelectControl({ id, label, value, onChange, options, placeholder, icon: Icon, required, error, className = "" }) {
  const style = useStyle();

  return (
    <Field label={label} htmlFor={id} required={required} error={error}>
      <div className="relative">
        {Icon && (
          <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${style.secondaryText}`}>
            <Icon size={15} />
          </span>
        )}
        <select
          id={id}
          aria-required={required}
          aria-invalid={Boolean(error)}
          value={value}
          onChange={onChange}
          className={`w-full appearance-none rounded-lg border px-3 py-2.5 text-sm transition ${style.input} ${style.inputFocus} ${Icon ? "pl-9" : "pl-3"} ${error ? style.redBorder : ""} ${className}`}
          style={{ backgroundImage: "none" }}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {(options || []).map((option) => {
            if (typeof option === "string") return <option key={option} value={option}>{option}</option>;
            return <option key={option.value} value={option.value}>{option.label}</option>;
          })}
        </select>
        <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${style.secondaryText}`}>
          <ChevronDown size={15} />
        </span>
      </div>
    </Field>
  );
}

function Toggle({ checked, onChange, label, helperText, name }) {
  const style = useStyle();

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${style.border} ${style.grayBg}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        name={name}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${checked ? "border-blue-500 bg-blue-500/90" : `${style.grayBorder} ${style.grayBg2}`}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
      <div>
        <p className={`text-sm font-medium ${style.primaryText}`}>{label}</p>
        {helperText && <p className={`mt-1 text-xs ${style.secondaryText}`}>{helperText}</p>}
      </div>
    </div>
  );
}

function InputWithIcon({ id, type = "text", value, onChange, placeholder, icon: Icon, required, error, ariaLabel, inputMode, min, max }) {
  const style = useStyle();

  return (
    <div className="relative">
      {Icon && (
        <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${style.secondaryText}`}>
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
        className={`h-11 w-full rounded-lg border px-3 text-sm transition ${style.input} ${style.inputFocus} ${style.inputPlaceholder} ${Icon ? "pl-9" : "pl-3"} ${error ? style.redBorder : ""}`}
      />
    </div>
  );
}

function TextareaWithIcon({ id, value, onChange, onBlur, placeholder, icon: Icon, required, error, rows = 3 }) {
  const style = useStyle();

  return (
    <div className="relative">
      {Icon && (
        <span className={`pointer-events-none absolute left-3 top-3 ${style.secondaryText}`}>
          <Icon size={15} />
        </span>
      )}
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-required={required}
        aria-invalid={Boolean(error)}
        className={`w-full resize-none rounded-lg border px-3 py-2.5 text-sm transition ${style.input} ${style.inputFocus} ${style.inputPlaceholder} ${Icon ? "pl-9" : "pl-3"} ${error ? style.redBorder : ""}`}
      />
    </div>
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

function getInterviewAccent(status, style) {
  if (status === "completed") return `${style.greenBorder} ${style.greenText}`;
  if (status === "cancelled") return `${style.redBorder} ${style.redText}`;
  return `${style.blueBorder} ${style.blueText}`;
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

function getInterviewRelativeTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;

  const interviewTime = new Date(`${dateValue}T${timeValue}:00+08:00`);
  if (Number.isNaN(interviewTime.getTime())) return null;

  const difference = interviewTime.getTime() - Date.now();
  if (Math.abs(difference) < 60_000) return "starting now";

  const isUpcoming = difference > 0;
  const hours = Math.floor(Math.abs(difference) / 3_600_000);
  if (hours === 0) return isUpcoming ? "in less than an hour" : "less than an hour ago";

  if (hours < 24) {
    const unit = hours === 1 ? "hour" : "hours";
    return isUpcoming ? `in ${hours} ${unit}` : `${hours} ${unit} ago`;
  }

  const days = Math.floor(hours / 24);
  const unit = days === 1 ? "day" : "days";
  return isUpcoming ? `in ${days} ${unit}` : `${days} ${unit} ago`;
}

function normalizeInterview(application) {
  if (!application || !application.interview || typeof application.interview !== "object") return null;
  const interview = application.interview;
  const date = interview.date || "";
  const time = interview.time || "";
  const platform = interview.platform
    || (interview.format === "Onsite" ? "On-site" : interview.format === "Phone" ? "Phone" : "Zoom");
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
    type: interview.type || "Technical",
    format: interview.format || getFormatForPlatform(platform),
    platform,
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

function InterviewDrawer({ interview, style, isPreparing, onClose, onSave, onDelete, onPrepare }) {
  const [notes, setNotes] = useState(interview?.notes || "");
  const [questionItems, setQuestionItems] = useState(() => getQuestionItems(interview?.questions));

  if (!interview) return null;

  const meetingUrl = safeUrl(interview.meetingLink);
  const relativeTime = getInterviewRelativeTime(interview.date, interview.time);
  const checklist = interview.checklist || [];
  const completedChecklistCount = checklist.filter((item) => item.done).length;
  const saveQuestions = (items) => {
    const questions = items.map((question) => question.trim()).filter(Boolean).join("\n");
    if (questions !== (interview.questions || "")) onSave({ ...interview, questions });
  };

  return (
    <Portal>
    <div className="drawer-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <aside className={`flex h-full w-full max-w-md flex-col overflow-hidden border-l shadow-2xl ${style.border} ${style.secondaryBg}`} role="dialog" aria-modal="true" aria-labelledby="interview-drawer-title">
        <header className={`flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4 ${style.border}`}>
          <div className="min-w-0">
            <h2 id="interview-drawer-title" className={`text-xl font-semibold ${style.primaryText}`}>{interview.company}</h2>
            <p className={`mt-1 text-sm ${style.secondaryText}`}>{interview.role}</p>
          </div>
          <button
            type="button"
            aria-label="Close interview details"
            onClick={onClose}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.hoverBg} ${style.secondaryText}`}
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
        <section className={`space-y-3 rounded-xl border p-4 ${style.border} ${style.grayBg}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm ${style.secondaryText}`}>{interview.type} · {interview.platform}</span>
          </div>
          <p className={`text-sm ${style.primaryText}`}>
            <span className="font-medium">When:</span> {formatDateLabel(interview.date)} · {formatTimeLabel(interview.time)}
            {relativeTime && (
              <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style.blueBg2} ${style.blueText}`}>
                {relativeTime}
              </span>
            )}
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
            <a href={safeUrl(interview.jobUrl)} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 text-sm font-medium ${style.blueText}`}>
              View application
            </a>
          )}
          {interview.location && (
            <p className={`flex items-center gap-2 text-sm ${style.secondaryText}`}>
              <MapPin size={14} /> {interview.location}
            </p>
          )}
        </section>

        <div className="space-y-5">
          <FormSection title="Interview outcome">
            <SelectControl
              id="view-interview-outcome"
              label="Outcome"
              value={interview.outcome || "Pending"}
              onChange={(event) => onSave({ ...interview, outcome: event.target.value, status: "completed" })}
              options={["Pending", "Passed", "Rejected", "Offer", "No response"]}
            />
          </FormSection>

          <FormSection title="Notes & follow-up">
            <div className="space-y-4">
              <Field label="Notes" htmlFor="view-interview-notes">
                <TextareaWithIcon
                  id="view-interview-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  onBlur={() => {
                    if (notes !== (interview.notes || "")) onSave({ ...interview, notes });
                  }}
                  icon={fieldIcons.link}
                  placeholder="Interview context, key metrics, and topics to discuss..."
                  rows={4}
                />
              </Field>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm font-medium ${style.primaryText}`}>Questions to ask</p>
                  <button
                    type="button"
                    onClick={() => setQuestionItems([...questionItems, ""])}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium ${style.blueBorder} ${style.blueText} ${style.hoverBg}`}
                  >
                    <Plus size={14} /> Add question
                  </button>
                </div>
                {questionItems.length > 0 ? (
                  <ul aria-label="Interview questions" className="space-y-2">
                    {questionItems.map((question, index) => (
                      <li key={index} className={`flex items-center gap-2 rounded-lg border p-2 ${style.border} ${style.grayBg}`}>
                        <span className={`w-5 shrink-0 text-center text-xs ${style.mutedText}`}>{index + 1}</span>
                        <input
                          type="text"
                          aria-label={`Question ${index + 1}`}
                          value={question}
                          onChange={(event) => setQuestionItems(questionItems.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                          onBlur={() => saveQuestions(questionItems)}
                          placeholder="Enter a question"
                          className={`min-w-0 flex-1 rounded-md border px-3 py-2 text-sm ${style.input} ${style.inputFocus} ${style.inputPlaceholder}`}
                        />
                        <button
                          type="button"
                          aria-label={`Remove question ${index + 1}`}
                          title="Remove question"
                          onClick={() => {
                            const nextItems = questionItems.filter((_, itemIndex) => itemIndex !== index);
                            setQuestionItems(nextItems);
                            saveQuestions(nextItems);
                          }}
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${style.redText} ${style.hoverBg}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`rounded-lg border border-dashed p-3 text-xs ${style.border} ${style.secondaryText}`}>
                    Add each interview question separately. You can edit or remove them anytime.
                  </p>
                )}
              </div>
            </div>
          </FormSection>

          <section className={`border-b-2 pb-5 ${style.border}`} aria-labelledby="prep-checklist-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 id="prep-checklist-heading" className={`text-sm font-semibold ${style.primaryText}`}>Prep checklist</h3>
              {checklist.length > 0 && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${style.blueBg2} ${style.blueText}`}>
                  {completedChecklistCount}/{checklist.length} complete
                </span>
              )}
            </div>
            {checklist.length > 0 ? (
              <ul className="space-y-2">
                {checklist.map((item, index) => (
                  <li key={`${item.text}-${index}`} className={`rounded-lg border p-3 ${style.border} ${style.grayBg}`}>
                    <label className={`flex cursor-pointer items-start gap-3 text-sm ${item.done ? style.mutedText : style.primaryText}`}>
                      <input
                        type="checkbox"
                        checked={Boolean(item.done)}
                        onChange={(event) => {
                          const nextChecklist = checklist.map((entry, entryIndex) => entryIndex === index ? { ...entry, done: event.target.checked } : entry);
                          onSave({ ...interview, checklist: nextChecklist });
                        }}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                      />
                      <span>{item.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`rounded-lg border border-dashed p-3 text-sm ${style.border} ${style.secondaryText}`}>
                No prep checklist items yet.
              </p>
            )}
          </section>

        </div>
        </div>

        <footer className={`shrink-0 border-t px-4 py-4 ${style.border} ${style.secondaryBg} sm:px-5`}>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => onPrepare(interview)}
              disabled={isPreparing}
              className={`rounded-md flex  items-center gap-1 px-4 py-2.5 text-sm font-medium ${style.buttonIndigo}`}
            >
              <Sparkles size={15} className={isPreparing ? "animate-pulse" : ""} />
              <span className="break-words text-left">
                Prepare with Lumi
              </span>
            </button>
            {meetingUrl && (
              <a href={meetingUrl} target="_blank" rel="noreferrer" className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm ${style.border} ${style.primaryText}`}>
                Join meeting
              </a>
            )}
            <button 
              type="button" 
              onClick={() => onDelete(interview)} 
              className={`rounded-md px-4 py-2.5 text-sm font-medium ${style.buttonRed}`}
            >
              Remove
            </button>
          </div>
        </footer>
      </aside>
    </div>
    </Portal>
  );
}

function InterviewPageSkeleton({ style, view, calendarCells, calendarMonth }) {
  const placeholder = `animate-pulse rounded ${style.grayBg2}`;

  return (
    <section
      className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(17rem,0.7fr)] "
      aria-label="Loading interviews"
      aria-busy="true"
    >
      <section aria-label="Interview schedule loading" className="min-w-0">
        {view === "Calendar" ? (
          <div className={`mb-4 min-w-0 overflow-hidden rounded-md border ${style.border} ${style.secondaryBg}`}>
            <div className="flex items-center justify-center px-2 py-2 sm:px-4">
              <div className="inline-flex max-w-full items-center">
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.primaryText}`}>
                  <ArrowLeft size={16} />
                </span>
                <span className={`min-w-36 px-3 text-center text-sm font-semibold sm:min-w-44 sm:text-base ${style.primaryText}`}>
                  {formatMonthLabel(calendarMonth)}
                </span>
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.primaryText}`}>
                  <ArrowRight size={16} />
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className={`grid min-w-[640px] grid-cols-7 border-t ${style.border}`}>
                {weekdayLabels.map((day) => (
                  <div key={day} className={`border-b border-r py-2 text-center text-[11px] font-medium ${style.border} ${style.secondaryText}`}>
                    {day}
                  </div>
                ))}
                {calendarCells.map((cell) => {
                  const eventCount = cell.inMonth
                    ? (cell.date.getDate() === 18 ? 1 : [14, 15].includes(cell.date.getDate()) ? 2 : 0)
                    : 0;
                  return (
                    <div
                      key={cell.key}
                      className={`min-h-20 min-w-0 border-b border-r p-1 transition-colors sm:min-h-28 sm:p-2 ${style.border} ${cell.inMonth ? style.secondaryBg : `${style.primaryBg} opacity-50`} ${cell.isToday ? style.blueBgSubtle : ""}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs tabular-nums ${cell.isToday ? "bg-blue-600 font-semibold text-white" : style.secondaryText}`}>
                          {cell.date.getDate()}
                        </span>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {Array.from({ length: eventCount }, (_, index) => (
                          <div key={index} className={`h-5 rounded-sm border-l-2 px-1.5 py-1 ${style.blueBorder}`}>
                            <div className={`h-2 rounded ${placeholder} ${index === 0 ? "w-3/4" : "w-1/2"}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className={`border-t ${style.border}`}>
            {Array.from({ length: 3 }, (_, group) => (
              <section key={group} className={`border-b py-4 ${style.border}`}>
                <div className={`mb-3 h-3 w-24 ${placeholder}`} />
                <div className={`divide-y ${style.border}`}>
                  {Array.from({ length: 2 }, (_, row) => (
                    <div key={row} className="flex items-center gap-3 py-3">
                      <div className={`h-8 w-0.5 shrink-0 ${placeholder}`} />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className={`h-3 w-2/5 ${placeholder}`} />
                        <div className={`h-3 w-3/5 ${placeholder}`} />
                      </div>
                      <div className={`h-6 w-20 rounded-full ${placeholder}`} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <aside className="grid min-w-0 grid-cols-1 gap-4 lg:pt-1">
        <section className={`min-w-0 rounded-md border p-4 shadow-sm sm:p-5 ${style.border} ${style.secondaryBg}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${style.blueBg2} ${style.blueText}`}>
                <CalendarDays size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className={`text-base font-semibold ${style.primaryText}`}>Coming up</h2>
                <p className={`mt-0.5 text-xs ${style.secondaryText}`}>Scheduled over the next 2 weeks</p>
              </div>
            </div>
            <div className={`h-6 w-8 animate-pulse rounded-full ${style.blueBg2}`} />
          </div>
          <ul className="space-y-2">
            {Array.from({ length: 2 }, (_, index) => (
              <li key={index} className={`min-w-0 rounded-md border p-3 sm:p-4 ${style.border} ${style.grayBg}`}>
                <div className={`h-3 w-1/3 ${placeholder}`} />
                <div className={`mt-2 h-3 w-2/5 ${placeholder}`} />
                <div className={`mt-3 h-3 w-3/5 ${placeholder}`} />
                <div className={`mt-1 h-3 w-1/2 ${placeholder}`} />
              </li>
            ))}
          </ul>
        </section>
      </aside>
      <span className="sr-only">Loading interviews…</span>
    </section>
  );
}

export default function InterviewsPage() {
  const navigate = useNavigate();
  const style = useStyle();
  const [searchParams, setSearchParams] = useSearchParams();
  const { applications: loadedApplications, setApplications } = useOutletContext();
  const isLoading = !Array.isArray(loadedApplications);
  const applicationList = useMemo(() => (Array.isArray(loadedApplications) ? loadedApplications : []), [loadedApplications]);
  const applicationIdParam = searchParams.get("applicationId");
  const scheduleTriggerRef = useRef(null);
  const modalRef = useRef(null);
  const discardDialogRef = useRef(null);
  const discardTriggerRef = useRef(null);
  const initialDraftRef = useRef(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedInterviewId, setSelectedInterviewId] = useState(null);
  const [preparingInterviewId, setPreparingInterviewId] = useState(null);
  const [view, setView] = useState("Calendar");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [questionItems, setQuestionItems] = useState([]);
  const [draft, setDraft] = useState(() => {
    const selectedApp = applicationList.find((item) => item.id === applicationIdParam);
    return {
      applicationId: selectedApp?.id || "",
      date: "",
      time: "",
      type: "Technical",
      format: "Video",
      platform: "Zoom",
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
  const requiresMeetingLink = !["Phone", "On-site"].includes(draft.platform);
  const isOnsitePlatform = draft.platform === "On-site";
  const isSaveDisabled = !draft.applicationId || !draft.date || !draft.time || isSaving || (requiresMeetingLink && !draft.meetingLink) || (isOnsitePlatform && !draft.location);
  const updateQuestionItems = (nextItems) => {
    setQuestionItems(nextItems);
    setDraft((current) => ({ ...current, questions: nextItems.join("\n") }));
  };

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
    if (confirmDiscard && hasUnsavedChanges) {
      discardTriggerRef.current = document.activeElement;
      setDiscardDialogOpen(true);
      return;
    }
    setScheduleOpen(false);
    setDiscardDialogOpen(false);
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

  const cancelDiscardDialog = useCallback(() => {
    setDiscardDialogOpen(false);
    window.requestAnimationFrame(() => discardTriggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!discardDialogOpen) return;
    discardDialogRef.current?.querySelector("button")?.focus();
  }, [discardDialogOpen]);

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
      if (discardDialogOpen) {
        if (event.key === "Escape") {
          event.preventDefault();
          cancelDiscardDialog();
        }
        return;
      }
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
  }, [cancelDiscardDialog, closeScheduleModal, discardDialogOpen, isSaveDisabled, scheduleOpen]);

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
      type: "Technical",
      format: "Video",
      platform: "Zoom",
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
    setQuestionItems([]);
    setErrors({});
    setIsSaving(false);
    setScheduleOpen(true);
  };

  const saveInterview = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!draft.applicationId) nextErrors.applicationId = "Please select an application.";
    if (!draft.date) nextErrors.date = "Choose a date.";
    if (!draft.time) nextErrors.time = "Choose a time.";
    if (requiresMeetingLink && !safeUrl(draft.meetingLink)) nextErrors.meetingLink = "Add a valid video meeting link or URL.";
    if (isOnsitePlatform && !draft.location) nextErrors.location = "Add the interview location or address.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Please complete the required fields before saving.");
      return;
    }

    setIsSaving(true);
    try {
      const interviewToSave = {
        ...draft,
        questions: questionItems.map((question) => question.trim()).filter(Boolean).join("\n"),
      };
      const { data } = await api.put(
        `/applications/${encodeURIComponent(draft.applicationId)}/interview`,
        interviewToSave,
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
    const prompt = `Help me prepare for my ${interview.role} interview at ${interview.company} on ${formatDateLabel(interview.date)}. My interview details are: ${interview.type}, ${interview.platform}, and ${interview.location || "remote"}.`;
    setPreparingInterviewId(interview.id);
    window.setTimeout(() => navigate(`/lumi-assists?prompt=${encodeURIComponent(prompt)}`), 600);
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
          <div className={`flex items-center  rounded-md border  ${style.border} ${style.grayBg}`} role="group" aria-label="Schedule view">
            <button
              type="button"
              onClick={() => setView("Calendar")}
              aria-label="Month view"
              aria-pressed={view === "Calendar"}
              title="Month view"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-l-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${view === "Calendar" ? `${style.blueBg2} ${style.blueText}` : `${style.secondaryText} ${style.hoverBg}`}`}
            >
              <CalendarDays size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setView("List")}
              aria-label="List view"
              aria-pressed={view === "List"}
              title="List view"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-r-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${view === "List" ? `${style.blueBg2} ${style.blueText}` : `${style.secondaryText} ${style.hoverBg}`}`}
            >
              <List size={16} aria-hidden="true" />
            </button>
          </div>
          <button type="button" onClick={() => openScheduleModal()} className={`inline-flex  items-center gap-2 rounded-md px-3 py-2 text-sm font-medium sm:px-4 ${style.buttonBlue}`}>
            <BadgePlus size={16} aria-hidden="true" /> Schedule Interview
          </button>
        </div>
      </div>

      {isLoading ? (
        <InterviewPageSkeleton style={style} view={view} calendarCells={calendarCells} calendarMonth={calendarMonth} />
      ) : (
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(17rem,0.7fr)]">
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
              <div className="overflow-x-auto">
                <div className={`grid min-w-[640px] grid-cols-7 border-t ${style.border}`} role="group" aria-label="Monthly interview calendar">
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
                    className={`group relative min-h-20 min-w-0 border-b border-r p-1 transition-colors sm:min-h-28 sm:p-2 ${style.border} ${cell.inMonth ? style.secondaryBg : `${style.primaryBg} opacity-50`} ${cell.isToday ? style.blueBgSubtle : ""}`}
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
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition ${style.blueText} ${style.blueBg2hover} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100`}
                        >
                          <BadgePlus size={15} />
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
                            className={`block w-full truncate border-l-2 px-1.5 py-1 text-left text-[10px] leading-4 transition ${style.blueBg2hover} focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 sm:text-xs ${getInterviewAccent(status, style)}`}
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
            </div>
          )}

          {view === "List" && (
            <div className={`border-t ${style.border}`}>
              {groupedAgenda.length ? groupedAgenda.map(([dateKey, entries]) => (
                <section key={dateKey} className={`border-b py-4 ${style.border}`}>
                  <h3 className={`mb-2 text-xs font-semibold ${style.secondaryText}`}>
                    {dateKey === "unscheduled" ? "No date" : formatDateLabel(dateKey)}
                  </h3>
                  <div className={`divide-y ${style.divide}`}>
                    {entries.map((interview) => (
                      <button
                        key={interview.id}
                        type="button"
                        onClick={() => setSelectedInterviewId(interview.id)}
                        className={`flex w-full min-w-0 items-center gap-3 py-3 text-left ${style.hoverBg}`}
                      >
                        <span className={`h-8 w-0.5 shrink-0 border-l-2 ${getInterviewAccent(getInterviewStatus(interview), style).split(" ")[0]}`} aria-hidden="true" />
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

        <aside className="grid min-w-0 grid-cols-1 gap-4 lg:pt-1">
          <section className={`min-w-0 rounded-md border p-4 shadow-sm sm:p-5 ${style.border} ${style.secondaryBg}`} aria-labelledby="coming-up-heading">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${style.blueBg2} ${style.blueText}`} aria-hidden="true">
                  <CalendarDays size={19} />
                </span>
                <div className="min-w-0">
                  <h2 id="coming-up-heading" className={`text-base font-semibold ${style.primaryText}`}>Coming up</h2>
                  <p className={`mt-0.5 text-xs ${style.secondaryText}`}>Scheduled over the next 2 weeks</p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${style.blueBg2} ${style.blueText}`}>
                {upcomingInterviews.length}
              </span>
            </div>
            {upcomingInterviews.length ? (
              <ul className="space-y-2">
                {upcomingInterviews.slice(0, 6).map((interview) => (
                  <li key={interview.id} className={`min-w-0 rounded-md border p-3 transition-colors sm:p-4 ${style.border} ${style.grayBg}`}>
                    <button type="button" onClick={() => setSelectedInterviewId(interview.id)} className="block w-full min-w-0 text-left focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                      <span className={`block break-words text-sm font-semibold leading-5 ${style.primaryText}`}>{interview.company}</span>
                      <span className={`mt-1 block break-words text-xs leading-5 ${style.secondaryText}`}>{interview.role}</span>
                      <span className={`mt-3 block text-xs font-semibold leading-5 ${style.primaryText}`}>{formatDateLabel(interview.date)} <span className={style.mutedText}>·</span> {formatTimeLabel(interview.time)}</span>
                      <span className={`mt-1 block break-words text-xs ${style.secondaryText}`}>{interview.type} <span aria-hidden="true">·</span> {interview.platform}</span>
                    </button>
                    <div className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 `}>
                      {safeUrl(interview.meetingLink) && (
                        <a href={safeUrl(interview.meetingLink)} target="_blank" rel="noreferrer" className={`min-h-8 inline-flex items-center text-xs font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${style.blueText}`}>Join meeting</a>
                      )}

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
                      <span className={`shrink-0 text-xs font-medium ${style.blueText}`}>Schedule</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
      )}

      {scheduleOpen && (
        <Portal>
        <div className="drawer-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeScheduleModal();
        }}>
          <aside
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-interview-title"
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const focusable = [...event.currentTarget.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])')];
              if (!focusable.length) return;
              if (event.shiftKey && document.activeElement === focusable[0]) {
                event.preventDefault();
                focusable.at(-1).focus();
              } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
                event.preventDefault();
                focusable[0].focus();
              }
            }}
            className={`relative flex h-full w-full max-w-md flex-col overflow-hidden border-l shadow-2xl ${style.border} ${style.secondaryBg}`}
          >
            <header className={`flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4 ${style.border}`}>
              <div className="min-w-0">
                <h2 id="schedule-interview-title" className={`text-xl font-semibold ${style.primaryText}`}>Schedule interview</h2>
                <p className={`mt-1 text-sm ${style.secondaryText}`}>Add the time and details for your next conversation.</p>
              </div>
              <button
                type="button"
                aria-label="Close schedule interview dialog"
                onClick={closeScheduleModal}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.hoverBg} ${style.secondaryText}`}
              >
                <X size={20} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-5 p-4 sm:p-5">
                <section className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4 ${style.border} ${style.grayBg}`}>
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
                </section>

                <form id="schedule-interview-form" noValidate onSubmit={saveInterview} className="space-y-5">
                  <FormSection title="Application">
                    <div className="space-y-3">
                      <SelectControl
                        id="application-select"
                        label="Company Application"
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

                  <FormSection title="When">
                      <div className="space-y-4">
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
                        <fieldset className="grid grid-cols-2 gap-2">
                          <legend className={`mb-1.5 text-[13px] font-medium ${style.primaryText}`}>Interview type</legend>
                          {interviewTypeOptions.map((type) => (
                            <label key={type} className={`flex  cursor-pointer items-center gap-3 rounded border px-3 py-2 text-sm ${style.border} ${style.primaryText} ${style.hoverBg}`}>
                              <input
                                type="radio"
                                name="interview-type"
                                value={type}
                                checked={draft.type === type}
                                onChange={() => setDraft((current) => ({ ...current, type }))}
                                className="accent-blue-600"
                              />
                              {type}
                            </label>
                          ))}
                        </fieldset>
                      </div>


                  </FormSection>

                  <FormSection title="Interview details">
                      <div className="space-y-4">
                        <SelectControl
                          id="interview-outcome"
                          label="Outcome"
                          value={draft.outcome}
                          onChange={(event) => setDraft((current) => ({ ...current, outcome: event.target.value }))}
                          options={["Pending", "Passed", "Rejected", "Offer", "No response"]}
                        />

                        <SelectControl
                          id="meeting-platform"
                          label="Interview platform"
                          value={draft.platform}
                          onChange={(event) => {
                            const nextPlatform = event.target.value;
                            setDraft((current) => ({
                              ...current,
                              platform: nextPlatform,
                              format: getFormatForPlatform(nextPlatform),
                              meetingLink: "",
                              location: nextPlatform === "On-site" ? current.location : "",
                            }));
                            setErrors((current) => ({ ...current, meetingLink: undefined, location: undefined }));
                          }}
                          options={interviewPlatformOptions}
                          icon={fieldIcons.clock}
                        />

                        {requiresMeetingLink && (
                            <Field label="Meeting link" htmlFor="meeting-link" required error={errors.meetingLink}>
                              <InputWithIcon
                                id="meeting-link"
                                type="url"
                                value={draft.meetingLink}
                                onChange={(event) => {
                                  setDraft((current) => ({ ...current, meetingLink: event.target.value }));
                                  setErrors((current) => ({ ...current, meetingLink: undefined }));
                                }}
                                icon={fieldIcons.link}
                                placeholder="https://"
                                required
                                error={errors.meetingLink}
                              />
                            </Field>
                        )}

                        {isOnsitePlatform && (
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

                  <FormSection title="Contact">
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
                        <div className="space-y-4">
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

                  <FormSection title="Notes & follow-up" className="border-b-none">
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
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <p className={`text-sm font-medium ${style.primaryText}`}>Questions to ask</p>
                            <button
                              type="button"
                              onClick={() => updateQuestionItems([...questionItems, ""])}
                              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium ${style.blueBorder} ${style.blueText} ${style.hoverBg}`}
                            >
                              <Plus size={14} /> Add question
                            </button>
                          </div>
                          {questionItems.length > 0 ? (
                            <ul aria-label="Interview questions" className="space-y-2">
                              {questionItems.map((question, index) => (
                                <li key={index} className={`flex items-center gap-2 rounded-lg border p-2 ${style.border} ${style.grayBg}`}>
                                  <span className={`w-5 shrink-0 text-center text-xs ${style.mutedText}`}>{index + 1}</span>
                                  <input
                                    type="text"
                                    aria-label={`Question ${index + 1}`}
                                    value={question}
                                    onChange={(event) => updateQuestionItems(questionItems.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                                    placeholder="Enter a question"
                                    className={`min-w-0 flex-1 rounded-md border px-3 py-2 text-sm ${style.input} ${style.inputFocus} ${style.inputPlaceholder}`}
                                  />
                                  <button
                                    type="button"
                                    aria-label={`Remove question ${index + 1}`}
                                    title="Remove question"
                                    onClick={() => updateQuestionItems(questionItems.filter((_, itemIndex) => itemIndex !== index))}
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${style.redText} ${style.hoverBg}`}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className={`rounded-lg border border-dashed p-3 text-xs ${style.border} ${style.secondaryText}`}>
                              Add each interview question separately. You can edit or remove them anytime.
                            </p>
                          )}
                        </div>
                        <Toggle
                          checked={Boolean(draft.reminder)}
                          onChange={(value) => setDraft((current) => ({ ...current, reminder: value }))}
                          label="Reminder enabled"
                          helperText="Email reminders are sent 7 days and 24 hours before the interview."
                        />
                      </div>
                  </FormSection>
                </form>
              </div>
            </div>

            <footer className={`shrink-0 border-t px-4 py-4 ${style.secondaryBg} ${style.border} sm:px-5`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <div className={`text-[11px] ${style.secondaryText}`}>Esc to close · Ctrl/Cmd + Enter to save</div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={closeScheduleModal} className={`rounded-md border px-4 py-2.5 text-sm font-medium ${style.border} ${style.primaryText} ${style.hoverBg}`}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="schedule-interview-form"
                    disabled={isSaveDisabled}
                    className={`rounded-md px-6 py-2.5 text-sm font-medium text-white transition ${style.buttonBlue}`}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </footer>
          </aside>
        </div>
        </Portal>
      )}

      {discardDialogOpen && (
        <Portal>
          <div
            className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) cancelDiscardDialog();
            }}
          >
            <div
              ref={discardDialogRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="discard-interview-title"
              aria-describedby="discard-interview-description"
              onKeyDown={(event) => {
                if (event.key !== "Tab") return;
                const focusable = [...event.currentTarget.querySelectorAll("button:not([disabled])")];
                if (!focusable.length) return;
                if (event.shiftKey && document.activeElement === focusable[0]) {
                  event.preventDefault();
                  focusable.at(-1).focus();
                } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
                  event.preventDefault();
                  focusable[0].focus();
                }
              }}
              className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${style.border} ${style.secondaryBg}`}
            >
              <h2 id="discard-interview-title" className={`text-lg font-semibold ${style.primaryText}`}>Discard changes?</h2>
              <p id="discard-interview-description" className={`mt-2 text-sm ${style.secondaryText}`}>
                Your unsaved interview details will be lost.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelDiscardDialog}
                  className={`rounded-md border px-4 py-2.5 text-sm font-medium ${style.border} ${style.primaryText} ${style.hoverBg}`}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={() => closeScheduleModal(false)}
                  className={`rounded-md px-4 py-2.5 text-sm font-medium ${style.buttonRed}`}
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {selectedInterview && (
        <InterviewDrawer
          key={selectedInterview.id}
          interview={selectedInterview}
          style={style}
          isPreparing={preparingInterviewId === selectedInterview.id}
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
