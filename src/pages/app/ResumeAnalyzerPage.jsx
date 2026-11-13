import { useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Download, LoaderCircle, Sparkles } from "lucide-react";
import { useStyle } from "../../components/ui/Style";
import ResumeAnalysisReport from "../../components/resume/ResumeAnalysisReport";
import { useResumeAnalysis } from "../../contexts/useResumeAnalysis";
import { exportOptimizedResume, getExportBaseName } from "../../lib/resumeExport";

function getResumeFormat(fileName) {
  const extension = String(fileName || "").toLowerCase().split(".").pop();
  return extension && extension !== fileName?.toLowerCase() ? extension.toUpperCase() : "Unknown";
}

export default function ResumeAnalyzerPage() {
  const style = useStyle();
  const [searchParams, setSearchParams] = useSearchParams();
  const { resumes: loadedResumes, setResumes, workspaceError, loadWorkspace } = useOutletContext();
  const { analyses, errors, analyzingResumeId, analyzeResume } = useResumeAnalysis();
  const [consentResumeId, setConsentResumeId] = useState("");
  const [reanalysisPromptOpen, setReanalysisPromptOpen] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState("txt");
  const [downloading, setDownloading] = useState(false);
  const isLoading = !Array.isArray(loadedResumes);
  const resumes = Array.isArray(loadedResumes) ? loadedResumes : [];
  const selectedResumeId = searchParams.get("resumeId") || "";
  const analyzerResume = resumes.find((resume) => resume.id === selectedResumeId)
    || (!selectedResumeId ? resumes[0] : null);
  const analysis = analyzerResume ? analyses[analyzerResume.id] : null;
  const analysisError = analyzerResume ? errors[analyzerResume.id] : "";
  const analyzing = analyzerResume?.id === analyzingResumeId;
  const analysisConsent = consentResumeId === analyzerResume?.id;

  const selectResume = (resumeId) => {
    setConsentResumeId("");
    setReanalysisPromptOpen(false);
    const nextParams = new URLSearchParams(searchParams);
    if (resumeId) nextParams.set("resumeId", resumeId);
    else nextParams.delete("resumeId");
    setSearchParams(nextParams);
  };

  const runAnalysis = () => {
    if (!analyzerResume || !analysisConsent || analyzing) return;
    setReanalysisPromptOpen(false);
    void analyzeResume(analyzerResume, setResumes);
  };

  const downloadOptimizedResume = async () => {
    if (!analysis?.optimizedResume || downloading) return;
    setDownloading(true);
    try {
      await exportOptimizedResume(
        analysis.optimizedResume,
        getExportBaseName(analyzerResume?.fileName),
        downloadFormat,
      );
    } catch (error) {
      console.error("Optimized resume export failed:", error?.name || "Error");
      toast.error(error?.message || "Unable to download the optimized resume.");
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return <p role="status" className={`mx-auto max-w-3xl text-sm ${style.secondaryText}`}>Loading resumes…</p>;
  }

  if (workspaceError) {
    return (
      <section className="mx-auto max-w-3xl" role="alert">
        <p className={style.primaryText}>Resume data could not be loaded.</p>
        <p className={`mt-2 text-sm ${style.secondaryText}`}>{workspaceError}</p>
        <button type="button" onClick={loadWorkspace} className={`mt-4 rounded-md px-4 py-2 text-sm ${style.buttonBlue}`}>Try again</button>
      </section>
    );
  }

  return (
    <section aria-labelledby="resume-analyzer-page-title" className="mx-auto w-full max-w-7xl">
      <nav aria-label="Breadcrumb" className={`mb-3 flex items-center gap-2 text-xs ${style.mutedText}`}>
        <Link to="/resume" className="hover:text-blue-500">Resume library</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">AI analyzer</span>
      </nav>
      <header className={`sticky top-0 z-30 -mx-4 mb-5 border-b px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 ${style.border} ${style.secondaryBg}`}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <Link to="/resume" className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium ${style.secondaryText} ${style.hoverBg}`}>
            <ArrowLeft size={16} aria-hidden="true" /> Back to resumes
          </Link>
          <div className="min-w-0 flex-1">
            <h1 id="resume-analyzer-page-title" className={`truncate text-base font-semibold ${style.primaryText}`}>
              {analyzerResume?.fileName || "AI resume analyzer"}
            </h1>
            <p className={`truncate text-xs ${style.secondaryText}`}>
              {analyzerResume ? `Analyzed for: ${analyzerResume.occupation || analysis?.occupation.primary || "Occupation not specified"}` : "Detailed resume report"}
            </p>
          </div>
          {analyzerResume && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => analysisConsent ? runAnalysis() : setReanalysisPromptOpen((open) => !open)}
                disabled={analyzing || Boolean(analyzingResumeId)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium disabled:opacity-60 ${style.border} ${style.secondaryButton}`}
              >
                {analyzing ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
                {analyzing ? "Analyzing…" : "Re-analyze"}
              </button>
              {analysis?.optimizedResume && (
                <button type="button" onClick={() => void downloadOptimizedResume()} disabled={downloading} aria-label="Download optimized resume" className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium disabled:opacity-60 ${style.buttonBlue}`}>
                  {downloading ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}
                  <span className="hidden sm:inline">{downloading ? "Preparing…" : "Download"}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {resumes.length === 0 ? (
        <div className={`rounded-lg border p-5 ${style.border} ${style.secondaryBg}`}>
          <p className={`text-sm ${style.secondaryText}`}>Upload a resume before starting an analysis.</p>
          <Link to="/resume" className={`mt-4 inline-flex min-h-10 items-center rounded-lg px-4 py-2 text-sm font-medium ${style.buttonBlue}`}>Go to resume library</Link>
        </div>
      ) : (
        <div className="space-y-5">
          <label htmlFor="analyzer-resume" className={`block max-w-xl text-sm font-medium ${style.primaryText}`}>
            Resume
            <select
              id="analyzer-resume"
              value={analyzerResume?.id || ""}
              onChange={(event) => selectResume(event.target.value)}
              disabled={Boolean(analyzingResumeId)}
              className={`mt-1.5 block min-h-11 w-full rounded-lg border px-3 py-2 text-sm ${style.input} ${style.inputFocus} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <option value="">Select a resume</option>
              {resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.fileName || resume.name || "Untitled resume"}</option>)}
            </select>
          </label>

          {analyzerResume && !analysis && (
            <section className={`max-w-3xl rounded-lg border p-4 sm:p-5 ${style.border} ${style.secondaryBg}`}>
              <p className={`text-sm ${style.secondaryText}`}>
                Role / occupation used as target: <span className={style.primaryText}>{analyzerResume.occupation || "AI will identify it during analysis"}</span>
                <span className="mx-2" aria-hidden="true">·</span>
                Source format: {getResumeFormat(analyzerResume.fileName)}
              </p>
              <label className={`mt-4 flex items-start gap-2 text-xs leading-5 ${style.secondaryText}`}>
                <input
                  type="checkbox"
                  checked={analysisConsent}
                  onChange={(event) => setConsentResumeId(event.target.checked ? analyzerResume.id : "")}
                  disabled={Boolean(analyzingResumeId)}
                  className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                />
                <span>I agree to send the selected resume to Google Gemini for analysis. If no occupation is set, the identified occupation will be saved to this resume.</span>
              </label>
              <p className={`mt-3 text-xs leading-5 ${style.mutedText}`}>Google may temporarily retain paid-service requests for safety or legal purposes. Analysis is optional guidance, may be inaccurate, and is not an employment decision.</p>
              {analysisError && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{analysisError}</p>}
              <button type="button" onClick={runAnalysis} disabled={!analysisConsent || Boolean(analyzingResumeId)} className={`mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${style.buttonBlue}`}>
                {analyzing ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
                {analyzing ? "Analyzing resume…" : analysisError ? "Retry analysis" : "Analyze resume"}
              </button>
            </section>
          )}

          {analyzerResume && analysis && reanalysisPromptOpen && (
            <section className={`max-w-3xl border-b pb-4 ${style.border}`}>
              <label className={`flex items-start gap-2 text-xs leading-5 ${style.secondaryText}`}>
                <input
                  type="checkbox"
                  checked={analysisConsent}
                  onChange={(event) => setConsentResumeId(event.target.checked ? analyzerResume.id : "")}
                  className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                />
                <span>I agree to send this resume to Google Gemini again for an updated analysis.</span>
              </label>
              <button type="button" onClick={runAnalysis} disabled={!analysisConsent || Boolean(analyzingResumeId)} className={`mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 ${style.buttonBlue}`}>
                <Sparkles size={15} aria-hidden="true" /> Confirm re-analysis
              </button>
            </section>
          )}

          {analyzerResume && analyzing && !analysis && (
            <p role="status" className={`text-sm ${style.secondaryText}`}>Gemini is analyzing the resume. This may take a moment.</p>
          )}
          {analyzerResume && analysis && (
            <>
              <p className={`text-sm ${style.secondaryText}`}>Source: {analyzerResume.fileName} · {getResumeFormat(analyzerResume.fileName)} · Result format: single-column, ATS-friendly text without tables or columns.</p>
              <ResumeAnalysisReport analysis={analysis} />
              <section className={`rounded-lg border p-4 sm:p-5 ${style.border} ${style.secondaryBg}`}>
                <div>
                  <h2 className={`text-base font-semibold ${style.primaryText}`}>ATS-friendly optimized resume</h2>
                  <p className={`mt-1 text-sm ${style.secondaryText}`}>Review the details carefully. This is a one-column text layout.</p>
                </div>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <label className={`block text-sm font-medium ${style.primaryText}`}>
                    Download format
                    <select value={downloadFormat} onChange={(event) => setDownloadFormat(event.target.value)} disabled={downloading} className={`mt-1 block min-h-10 rounded-lg border px-3 py-2 text-sm ${style.input} ${style.inputFocus}`}>
                      <option value="txt">TXT</option>
                      <option value="docx">DOCX</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </label>
                  <button type="button" onClick={() => void downloadOptimizedResume()} disabled={downloading} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-wait disabled:opacity-60 ${style.buttonBlue}`}>
                    {downloading ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
                    {downloading ? "Preparing download…" : "Download optimized resume"}
                  </button>
                </div>
                <pre className={`mt-4 whitespace-pre-wrap break-words rounded-lg border p-4 font-sans text-sm leading-6 ${style.border} ${style.secondaryText}`}>{analysis.optimizedResume}</pre>
              </section>
            </>
          )}
        </div>
      )}
    </section>
  );
}
