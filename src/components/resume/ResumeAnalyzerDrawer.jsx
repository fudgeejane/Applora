import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, LoaderCircle, Sparkles, X } from "lucide-react";
import { useStyle } from "../ui/Style";
import Portal from "../ui/Portal";
import { useResumeAnalysis } from "../../contexts/useResumeAnalysis";
import ResumeAnalysisReport, { ResumeAnalysisProgress } from "./ResumeAnalysisReport";

function DrawerSkeleton({ style }) {
  return (
    <div className="space-y-4">
      <ResumeAnalysisProgress style={style} />
      <div aria-hidden="true" className="space-y-4">
        {[0, 1, 2].map((item) => (
          <div key={item} className={`animate-pulse rounded-lg border p-5 ${style.border} ${style.secondaryBg}`}>
            <div className={`h-4 w-2/5 rounded ${style.isDarkMode ? "bg-[#333]" : "bg-slate-200"}`} />
            <div className={`mt-4 h-3 w-full rounded ${style.isDarkMode ? "bg-[#333]" : "bg-slate-200"}`} />
            <div className={`mt-2 h-3 w-4/5 rounded ${style.isDarkMode ? "bg-[#333]" : "bg-slate-200"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResumeAnalyzerDrawer({ resume, open, onClose, setResumes }) {
  const style = useStyle();
  const drawerRef = useRef(null);
  const returnFocusRef = useRef(null);
  const { analyses, errors, analyzingResumeId, analyzeResume } = useResumeAnalysis();
  const [consentResumeId, setConsentResumeId] = useState("");
  const reduceMotion = useReducedMotion();
  const id = resume?.id;
  const consented = consentResumeId === id;
  const analysis = id ? analyses[id] : null;
  const error = id ? errors[id] : "";
  const isAnalyzing = analyzingResumeId === id;

  useEffect(() => {
    if (!open || !resume) return undefined;
    returnFocusRef.current = document.activeElement;
    const dialog = drawerRef.current;
    const focusableSelector = "button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])";
    const focusable = () => Array.from(dialog?.querySelectorAll(focusableSelector) || []);
    focusable()[0]?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) {
        event.preventDefault();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus?.();
    };
  }, [open, resume, onClose]);

  const requestAnalysis = () => {
    if (!consented) return;
    void analyzeResume(resume, setResumes);
  };
  const showConsent = !analysis && !isAnalyzing && (!error || !consented);

  return (
    <Portal>
    <AnimatePresence>
    {open && resume && (
      <motion.div key="resume-analysis-drawer" className="drawer-overlay" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}>
      <button type="button" tabIndex={-1} aria-label="Close resume analyzer" onClick={onClose} className="absolute inset-0 h-full w-full cursor-default bg-transparent" />
      <motion.aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-analyzer-drawer-title"
        initial={{ x: reduceMotion ? 0 : "100%" }}
        animate={{ x: 0 }}
        exit={{ x: reduceMotion ? 0 : "100%" }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
        className={`absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col border-l shadow-2xl sm:w-[440px] ${style.border} ${style.secondaryBg}`}
      >
        <header className={`sticky top-0 z-10 flex min-h-[76px] items-center gap-3 border-b px-4 py-3 ${style.border} ${style.secondaryBg}`}>
          <div className="min-w-0 flex-1">
            <h2 id="resume-analyzer-drawer-title" title={resume.fileName || resume.name || "Untitled resume"} className={`truncate text-sm font-semibold ${style.primaryText}`}>
              {resume.fileName || resume.name || "Untitled resume"}
            </h2>
            <p className={`mt-1 truncate text-xs ${style.secondaryText}`}>
              Analyzed for: {resume.occupation || analysis?.occupation.primary || "AI-identified occupation"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close analyzer drawer" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${style.closeButton}`}>
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {isAnalyzing ? (
            <DrawerSkeleton style={style} />
          ) : error ? (
            <div role="alert" className={`rounded-lg border p-4 ${style.border} ${style.secondaryBg}`}>
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" aria-hidden="true" />
                <p className={`text-sm leading-6 ${style.primaryText}`}>{error}</p>
              </div>
              <button
                type="button"
                onClick={requestAnalysis}
                disabled={!consented || Boolean(analyzingResumeId)}
                className={`mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${style.buttonBlue}`}
              >
                <Sparkles size={15} aria-hidden="true" /> Retry analysis
              </button>
              {!consented && (
                <label className={`mt-3 flex items-start gap-2 text-xs leading-5 ${style.secondaryText}`}>
                  <input type="checkbox" checked={consented} onChange={(event) => setConsentResumeId(event.target.checked ? id : "")} className="mt-1 h-4 w-4 shrink-0 accent-blue-600" />
                  <span>I agree to send this resume to Applora for analysis.</span>
                </label>
              )}
            </div>
          ) : analysis ? (
            <ResumeAnalysisReport analysis={analysis} compact />
          ) : showConsent ? (
            <section className={`rounded-lg border p-4 sm:p-5 ${style.border} ${style.secondaryBg}`}>
              <h3 className={`text-base font-semibold ${style.primaryText}`}>Ready to analyze?</h3>
              <p className={`mt-2 text-sm leading-6 ${style.secondaryText}`}>
                Get an estimated ATS score, likely occupation matches, and practical ways to improve this resume.
              </p>
              <label className={`mt-4 flex items-start gap-2 text-xs leading-5 ${style.secondaryText}`}>
                <input type="checkbox" checked={consented} onChange={(event) => setConsentResumeId(event.target.checked ? id : "")} className="mt-1 h-4 w-4 shrink-0 accent-blue-600" />
                <span>I agree to send this resume to Applora for analysis. If no occupation is set, the identified occupation will be saved to this resume.</span>
              </label>
              <p className={`mt-3 text-xs leading-5 ${style.mutedText}`}>
                Applora may temporarily retain paid-service requests for safety or legal purposes. This AI-generated analysis is guidance only and may differ from how recruiters or employers assess your resume.
              </p>
              <button type="button" onClick={requestAnalysis} disabled={!consented || Boolean(analyzingResumeId)} className={`mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${style.buttonBlue}`}>
                <Sparkles size={15} aria-hidden="true" /> Analyze resume
              </button>
            </section>
          ) : null}
        </div>

        <footer className={`sticky bottom-0 border-t p-3 sm:px-4 ${style.border} ${style.secondaryBg}`}>
          <div className="flex items-center justify-between gap-2">
            <Link
              to={`/resume/analyzer?resumeId=${encodeURIComponent(resume.id)}`}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400 ${style.hoverBg}`}
            >
              View full report <ArrowRight size={15} aria-hidden="true" />
            </Link>
            {analysis && (
              <button type="button" onClick={() => void analyzeResume(resume, setResumes)} disabled={Boolean(analyzingResumeId)} className={`min-h-10 rounded-lg border px-3 text-sm font-medium disabled:opacity-60 ${style.border} ${style.secondaryButton}`}>
                {analyzingResumeId ? <><LoaderCircle size={14} className="mr-1 inline animate-spin" aria-hidden="true" /> Re-analyzing…</> : "Re-analyze"}
              </button>
            )}
          </div>
        </footer>
      </motion.aside>
      </motion.div>
    )}
    </AnimatePresence>
    </Portal>
  );
}
