import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { createApplicationId } from "../../utils/applicationUtils";

const statuses = ["Applied", "Screening", "Interview", "Offer", "Rejected"];
const sources = ["LinkedIn", "Indeed", "JobStreet", "Company Website", "Referral", "Other"];

function Field({ label, required, description, style, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className={`mb-1.5 block text-sm font-medium ${style.primaryText}`}>
        {label}{required && <span className="ml-1 text-blue-400">*</span>}
      </span>
      {children}
      {description && <span className={`mt-1.5 block text-xs leading-5 ${style.secondaryText}`}>{description}</span>}
    </label>
  );
}

function getLocalDateString() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function ApplicationModal({ application, style, onClose, onSave }) {
  const isEditing = Boolean(application);
  const [values, setValues] = useState(() => application ? {
    ...application,
    status: application.status === "Under Review" ? "Screening" : application.status === "Accepted" ? "Offer" : application.status,
    jobUrl: application.jobUrl || application.url || "",
    url: application.jobUrl || application.url || "",
    contactName: application.contactName || "",
    contactEmail: application.contactEmail || "",
    contactLinkedIn: application.contactLinkedIn || "",
    employmentType: application.employmentType || "",
    salaryPeriod: application.salaryPeriod || "month",
    source: sources.includes(application.source) ? application.source : application.source ? "Other" : "",
    customSource: sources.includes(application.source) ? "" : application.source || "",
  } : {
    role: "",
    company: "",
    location: "",
    workSetup: "Remote",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "PHP",
    salaryPeriod: "month",
    source: "",
    url: "",
    jobUrl: "",
    status: "Applied",
    dateApplied: getLocalDateString(),
    resumeUsed: "",
    notes: "",
    employmentType: "",
    contactName: "",
    contactEmail: "",
    contactLinkedIn: "",
  });
  const [error, setError] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const focusable = [...(dialogRef.current?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
        ) || [])];
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
    const previousOverflow = document.body.style.overflow;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const update = (key) => (event) => {
    setValues((current) => ({ ...current, [key]: event.target.value }));
    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (values.salaryMin && values.salaryMax && Number(values.salaryMin) > Number(values.salaryMax)) {
      const message = "Minimum salary cannot be greater than maximum salary.";
      setError(message);
      toast.error(message);
      return;
    }
    const todayString = getLocalDateString();
    if (values.dateApplied && values.dateApplied > todayString) {
      const message = "Date applied cannot be in the future. Choose today or an earlier date.";
      setError(message);
      toast.error(message);
      return;
    }
    const jobUrl = (values.jobUrl || values.url || "").trim();
    if (jobUrl && !isValidUrl(jobUrl)) {
      const message = "Enter a valid job posting URL beginning with http:// or https://.";
      setError(message);
      toast.error(message);
      return;
    }
    if (values.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail.trim())) {
      const message = "Enter a valid contact email address.";
      setError(message);
      toast.error(message);
      return;
    }
    if (values.contactLinkedIn && !isValidUrl(values.contactLinkedIn.trim())) {
      const message = "Enter a valid LinkedIn profile URL beginning with http:// or https://.";
      setError(message);
      toast.error(message);
      return;
    }

    onSave({
      ...values,
      role: values.role.trim(),
      company: values.company.trim(),
      location: values.location.trim(),
      notes: values.notes.trim(),
      url: jobUrl,
      jobUrl,
      contactName: values.contactName.trim(),
      contactEmail: values.contactEmail.trim(),
      contactLinkedIn: values.contactLinkedIn.trim(),
      source: values.source === "Other" ? (values.customSource || "Other") : values.source,
      id: application?.id || createApplicationId(),
    });
  };

  const inputClass = `w-full rounded-md border px-3 py-2 text-sm ${style.input} ${style.inputFocus} ${style.inputPlaceholder}`;

  function isValidUrl(value) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby="application-modal-title"
        className={`flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border ${style.border} ${style.secondaryBg}`}
      >
        <div className={`sticky top-0 z-10 flex items-center justify-between border-b px-5 py-4 ${style.border} ${style.secondaryBg}`}>
          <div>
            <h2 id="application-modal-title" className={`text-lg font-semibold ${style.primaryText}`}>
              {isEditing ? "Edit application" : "Add application"}
            </h2>
            <p className={`mt-1 text-xs ${style.secondaryText}`}>
              Add the job details and track your application. Fields marked <span className="text-blue-400">*</span> are required.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className={`rounded-md p-2 ${style.hoverBg} ${style.secondaryText}`}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-6 overflow-y-auto p-5">
            <section aria-labelledby="job-details-heading">
              <div className={`mb-4 border-b pb-3 ${style.border}`}>
                <h3 id="job-details-heading" className={`text-sm font-semibold ${style.primaryText}`}>Job details</h3>
                <p className={`mt-1 text-xs ${style.secondaryText}`}>Start with the role and company you applied to.</p>
              </div>
              <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                <Field label="Job title" required description="The position as listed in the job posting." style={style}>
                  <input autoFocus required maxLength={120} value={values.role} onChange={update("role")} placeholder="e.g. Product Designer" className={inputClass} />
                </Field>
                <Field label="Company name" required description="The organization offering the position." style={style}>
                  <input required maxLength={120} value={values.company} onChange={update("company")} placeholder="e.g. Acme Inc." className={inputClass} />
                </Field>
                <Field label="Location" description="City and country, or enter Remote." style={style}>
                  <input maxLength={120} value={values.location} onChange={update("location")} placeholder="e.g. Manila, Philippines" className={inputClass} />
                </Field>
                <Field label="Work setup" description="How the role is performed." style={style}>
                  <select value={values.workSetup} onChange={update("workSetup")} className={inputClass} style={{ colorScheme: style.isDarkMode ? "dark" : "light" }}>
                    {["Remote", "Hybrid", "On-site"].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
              </div>
            </section>

            <section aria-labelledby="compensation-heading">
              <div className={`mb-4 border-b pb-3 ${style.border}`}>
                <h3 id="compensation-heading" className={`text-sm font-semibold ${style.primaryText}`}>Compensation</h3>
                <p className={`mt-1 text-xs ${style.secondaryText}`}>Add the posted or expected salary range, if available.</p>
              </div>
              <div className="grid gap-x-4 gap-y-4 sm:grid-cols-4">
                <Field label="Minimum salary" description="Lowest amount in the range." style={style}>
                  <input type="number" min="0" step="any" value={values.salaryMin} onChange={update("salaryMin")} placeholder="e.g. 60000" className={inputClass} />
                </Field>
                <Field label="Maximum salary" description="Highest amount in the range." style={style}>
                  <input type="number" min="0" step="any" value={values.salaryMax} onChange={update("salaryMax")} placeholder="e.g. 85000" className={inputClass} />
                </Field>
                <Field label="Currency" description="Currency used for the salary amounts." style={style}>
                  <select value={values.salaryCurrency} onChange={update("salaryCurrency")} className={inputClass} style={{ colorScheme: style.isDarkMode ? "dark" : "light" }}>
                    {["PHP", "USD", "EUR", "GBP", "SGD", "AUD", "CAD", "Other"].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Pay period" description="How often the salary is paid." style={style}>
                  <select value={values.salaryPeriod || "month"} onChange={update("salaryPeriod")} className={inputClass} style={{ colorScheme: style.isDarkMode ? "dark" : "light" }}>
                    {["hour", "month", "year"].map((item) => <option key={item} value={item}>Per {item}</option>)}
                  </select>
                </Field>
              </div>
            </section>

            <section aria-labelledby="tracking-heading">
              <div className={`mb-4 border-b pb-3 ${style.border}`}>
                <h3 id="tracking-heading" className={`text-sm font-semibold ${style.primaryText}`}>Application tracking</h3>
                <p className={`mt-1 text-xs ${style.secondaryText}`}>Record when you applied and where you found the role.</p>
              </div>
              <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                <Field label="Application status" description="Choose the current stage of your application." style={style}>
                  <select value={values.status} onChange={update("status")} className={inputClass} style={{ colorScheme: style.isDarkMode ? "dark" : "light" }}>
                    {statuses.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Date applied" description="Choose today or an earlier date." style={style}>
                  <input type="date" value={values.dateApplied || ""} onChange={update("dateApplied")} className={inputClass} />
                </Field>
                <Field label="Job source" description="Where you found this opportunity." style={style}>
                  <select value={sources.includes(values.source) ? values.source : values.source ? "Other" : ""} onChange={update("source")} className={inputClass} style={{ colorScheme: style.isDarkMode ? "dark" : "light" }}>
                    <option value="">Select a source</option>
                    {sources.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                {values.source === "Other" && (
                  <Field label="Other source" description="Enter the job board or referral source." style={style}>
                    <input maxLength={80} value={values.customSource || ""} onChange={update("customSource")} placeholder="e.g. University career fair" className={inputClass} />
                  </Field>
                )}
                <Field label="Job posting URL" description="Optional link to the original job posting." style={style} className="sm:col-span-2">
                  <input type="url" maxLength={2048} value={values.jobUrl || values.url || ""} onChange={(event) => {
                    setValues((current) => ({ ...current, url: event.target.value, jobUrl: event.target.value }));
                    setError("");
                  }} placeholder="https://example.com/jobs/..." className={inputClass} />
                </Field>
              </div>
            </section>

            <section aria-labelledby="additional-heading">
              <div className={`mb-4 border-b pb-3 ${style.border}`}>
                <h3 id="additional-heading" className={`text-sm font-semibold ${style.primaryText}`}>Additional information</h3>
                <p className={`mt-1 text-xs ${style.secondaryText}`}>Keep track of the resume you sent and anything else worth remembering.</p>
              </div>
              <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                <Field label="Employment type" description="For example, full-time or contract." style={style}>
                  <select value={values.employmentType || ""} onChange={update("employmentType")} className={inputClass} style={{ colorScheme: style.isDarkMode ? "dark" : "light" }}>
                    <option value="">Select type</option>
                    {["Full-time", "Part-time", "Contract", "Temporary", "Internship", "Freelance"].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Contact person" description="Recruiter or hiring manager name." style={style}>
                  <input maxLength={120} value={values.contactName || ""} onChange={update("contactName")} placeholder="e.g. Alex Morgan" className={inputClass} />
                </Field>
                <Field label="Contact email" description="Optional contact email address." style={style}>
                  <input type="email" maxLength={254} value={values.contactEmail || ""} onChange={update("contactEmail")} placeholder="alex@example.com" className={inputClass} />
                </Field>
                <Field label="LinkedIn profile" description="Optional recruiter or hiring manager profile." style={style}>
                  <input type="url" maxLength={2048} value={values.contactLinkedIn || ""} onChange={update("contactLinkedIn")} placeholder="https://linkedin.com/in/..." className={inputClass} />
                </Field>
                <Field label="Resume used" description="Enter the resume file or version submitted for this role." style={style}>
                  <input maxLength={120} value={values.resumeUsed || ""} onChange={update("resumeUsed")} placeholder="e.g. Product Designer Resume" className={`${inputClass} sm:col-span-2`} />
                </Field>
                <Field label="Job description / notes" description="Save responsibilities, requirements, or follow-up notes." style={style} className="sm:col-span-2">
                  <textarea rows="3" maxLength={10000} value={values.notes || ""} onChange={update("notes")} placeholder="Add details you want to remember..." className={`${inputClass} resize-y`} />
                </Field>
              </div>
            </section>
          </div>
          <div className={`shrink-0 border-t px-5 py-4 ${style.border} ${style.secondaryBg}`}>
            {error && <p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className={`rounded-md border px-4 py-2 text-sm font-medium ${style.border} ${style.secondaryText} ${style.hoverBg}`}>
                Cancel
              </button>
              <button type="submit" className={`rounded-md px-4 py-2 text-sm font-medium ${style.buttonBlue}`}>
                {isEditing ? "Save changes" : "Save application"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
