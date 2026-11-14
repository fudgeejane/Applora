import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Portal from "../ui/Portal";

const esc = (value = "") => String(value).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
const safeUrl = (value) => { try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } };

export default function InterviewDrawer({ interview, style, onClose, onUpdate, onEdit, onDelete }) {
  const [saving, setSaving] = useState(false);
  const drawerRef = useRef(null);
  const openerRef = useRef(null);
  const interviewId = interview?.id;
  useEffect(() => {
    if (!interviewId) return undefined;
    openerRef.current = document.activeElement;
    drawerRef.current?.querySelector("button, a, input, textarea, select")?.focus();
    return () => { if (openerRef.current?.isConnected) openerRef.current.focus(); };
  }, [interviewId]);
  if (!interview) return null;
  const app = interview.application;
  const update = async (patch) => { setSaving(true); try { await onUpdate({ ...interview, ...patch }); } finally { setSaving(false); } };
  const questions = String(interview.questions || "").split(/\r?\n/).map((question) => question.trim()).filter(Boolean);
  const addCalendar = () => {
    const start = `${interview.date.replaceAll("-", "")}T${interview.time.replace(":", "")}00`;
    const endDate = new Date(`${interview.date}T${interview.time}:00`);
    endDate.setMinutes(endDate.getMinutes() + 60);
    const end = `${interview.date.replaceAll("-", "")}T${String(endDate.getHours()).padStart(2, "0")}${String(endDate.getMinutes()).padStart(2, "0")}00`;
    const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Applora//Interview//EN", "BEGIN:VEVENT", `DTSTART;TZID=Asia/Manila:${start}`, `DTEND;TZID=Asia/Manila:${end}`, `SUMMARY:${esc(`${app.company} - ${app.role} interview`)}`, `DESCRIPTION:${esc(interview.notes || interview.type)}`, safeUrl(interview.meetingLink) ? `URL:${safeUrl(interview.meetingLink)}` : "", "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
    const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(new Blob([body], { type: "text/calendar;charset=utf-8" })); anchor.download = `${app.id}-interview.ics`; anchor.click(); URL.revokeObjectURL(anchor.href);
  };
  const link = safeUrl(interview.meetingLink);
  return <Portal><div className="drawer-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="interview-drawer-title" onKeyDown={(event) => {
      if (event.key === "Escape") { event.stopPropagation(); onClose(); return; }
      if (event.key !== "Tab") return;
      const focusable = [...event.currentTarget.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])')];
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
    }} className={`h-full w-full max-w-xl overflow-y-auto border-l p-5 shadow-2xl ${style.border} ${style.secondaryBg}`}>
      <header className="flex items-start justify-between gap-4"><div><h2 id="interview-drawer-title" className={`text-xl font-semibold ${style.primaryText}`}>{app.company}</h2><p className={`mt-1 ${style.secondaryText}`}>{app.role}</p></div><button type="button" onClick={onClose} aria-label="Close interview details" className={`min-h-10 rounded-md px-3 text-sm ${style.hoverBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}>Close</button></header>
      <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => onEdit(interview)} className={`min-h-10 rounded-md border px-3 text-sm ${style.border} ${style.secondaryButton}`}>Edit / reschedule</button><button type="button" onClick={() => void update({ status: "cancelled" })} disabled={saving} className="min-h-10 rounded-md border border-red-300 px-3 text-sm text-red-700 dark:border-red-800 dark:text-red-300">Cancel interview</button><button type="button" onClick={onDelete} className="min-h-10 rounded-md border border-red-300 px-3 text-sm text-red-700 dark:border-red-800 dark:text-red-300">Delete</button><button type="button" onClick={addCalendar} className={`min-h-10 rounded-md border px-3 text-sm ${style.border} ${style.secondaryButton}`}>Add to calendar</button></div>
      <section className={`mt-5 space-y-2 rounded-xl border p-4 text-sm ${style.border}`}><p className={style.primaryText}>{interview.date} · {interview.time} Asia/Manila (UTC+8)</p><p className={style.secondaryText}>{interview.type || "Interview"} · {interview.platform || interview.format || "Platform not set"}</p><p className={style.secondaryText}>Status: {interview.status || "upcoming"}{interview.reminder ? " · Reminder enabled" : ""}</p>{interview.interviewer && <p className={style.secondaryText}>Interviewer: {interview.interviewer}</p>}{interview.interviewerEmail && <p><a className="text-blue-700 underline dark:text-blue-300" href={`mailto:${interview.interviewerEmail}`}>{interview.interviewerEmail}</a></p>}{interview.interviewerPhone && <p><a className="text-blue-700 underline dark:text-blue-300" href={`tel:${interview.interviewerPhone}`}>{interview.interviewerPhone}</a></p>}{link && <a href={link} target="_blank" rel="noreferrer" className="text-blue-700 underline dark:text-blue-300">Join meeting</a>}{interview.location && <p className={style.secondaryText}>Location: {interview.location}</p>}<Link className="block text-blue-700 underline dark:text-blue-300" to={`/applications/${encodeURIComponent(app.id)}`}>View linked application</Link></section>
      <label className={`mt-5 block text-sm font-medium ${style.primaryText}`}>Outcome<select value={interview.outcome || "Pending"} onChange={(event) => void update({ outcome: event.target.value, status: event.target.value === "Pending" ? "completed" : "completed" })} className={`mt-1 block w-full rounded-md border px-3 py-2 ${style.input} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}><option>Pending</option><option>Passed</option><option>Rejected</option><option>Offer</option><option>No response</option></select></label>
      <label className={`mt-4 block text-sm font-medium ${style.primaryText}`}>Notes<textarea rows={4} defaultValue={interview.notes} onBlur={(event) => { if (event.target.value !== (interview.notes || "")) void update({ notes: event.target.value }); }} className={`mt-1 block w-full rounded-md border px-3 py-2 ${style.input} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}/></label>
      <div className={`mt-4 block text-sm font-medium ${style.primaryText}`}><p>Questions to ask</p>{questions.length > 0 && <ul className={`mt-2 list-disc space-y-1 pl-5 font-normal ${style.secondaryText}`}>{questions.map((question, index) => <li key={`${question}-${index}`}>{question}</li>)}</ul>}<textarea aria-label="Edit interview questions" rows={3} defaultValue={interview.questions} onBlur={(event) => { if (event.target.value !== (interview.questions || "")) void update({ questions: event.target.value }); }} className={`mt-2 block w-full rounded-md border px-3 py-2 font-normal ${style.input} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}/></div>
      <div className="mt-4"><h3 className={`text-sm font-semibold ${style.primaryText}`}>Prep checklist</h3>{(interview.checklist || []).map((item, index) => <label key={`${item.text}-${index}`} className={`mt-2 flex items-center gap-2 text-sm ${style.secondaryText}`}><input type="checkbox" checked={item.done} onChange={(event) => void update({ checklist: interview.checklist.map((entry, i) => i === index ? { ...entry, done: event.target.checked } : entry) })}/>{item.text}</label>)}{!(interview.checklist || []).length && <p className={`mt-2 text-sm ${style.mutedText}`}>Add preparation items when editing the interview.</p>}</div>
    </aside>
  </div></Portal>;
}
