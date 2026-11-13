import { useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useStyle } from "../../components/ui/Style";
import ResumeAnalysisReport, { ResumeAnalysisProgress } from "../../components/resume/ResumeAnalysisReport";
import { useResumeAnalysis } from "../../contexts/useResumeAnalysis";
import { exportOptimizedResume, getExportBaseName } from "../../lib/resumeExport";
import { Download, LoaderCircle, Sparkle } from "lucide-react";

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
    <section aria-labelledby="resume-analyzer-page-title" className="mx-auto w-full min-w-0 max-w-7xl">
      <nav aria-label="Breadcrumb" className={`mb-4 flex flex-wrap items-center gap-2 text-xs ${style.mutedText}`}>
        <Link to="/resume" className="hover:text-blue-500">Resume library</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">AI analyzer</span>
      </nav>
      <header className="mb-5 space-y-1">
        <h1 id="resume-analyzer-page-title" className={`text-2xl font-bold tracking-tight sm:text-3xl ${style.primaryText}`}>AI resume analyzer</h1>
        <p className={`max-w-2xl text-sm leading-6 ${style.secondaryText}`}>Review your resume against applicant tracking systems and get practical suggestions.</p>
      </header>

      {resumes.length === 0 ? (
        <div className={`rounded-md border p-5 ${style.border} ${style.secondaryBg}`}>
          <p className={`text-sm ${style.secondaryText}`}>Upload a resume before starting an analysis.</p>
          <Link to="/resume" className={`mt-4 inline-flex min-h-10 items-center rounded-lg px-4 py-2 text-sm font-medium ${style.buttonBlue}`}>Go to resume library</Link>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <label htmlFor="analyzer-resume" className={`block w-full min-w-0 text-sm font-medium sm:max-w-xs ${style.primaryText}`}>
              <select
                id="analyzer-resume"
                value={analyzerResume?.id || ""}
                onChange={(event) => selectResume(event.target.value)}
                disabled={Boolean(analyzingResumeId)}
                className={` block m w-full rounded-md border px-3 py-2.5 text-sm ${style.input} ${style.inputFocus} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">Select a resume</option>
                {resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.fileName || resume.name || "Untitled resume"}</option>)}
              </select>
            </label>

            {analyzerResume && (
              <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                <button
                  type="button"
                  onClick={() => analysisConsent ? runAnalysis() : setReanalysisPromptOpen((open) => !open)}
                  disabled={analyzing || Boolean(analyzingResumeId)}
                  className={`inline-flex  gap-2 flex-1 items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-60 sm:flex-none ${style.buttonGray}`}
                >
                  <Sparkle size={16}  />
                  {analyzing ? "Analyzing…" : "Re-analyze"}
                </button>
                
              </div>
            )}
          </div>

          {analyzerResume && !analysis && (
            <section className={`w-full mx-auto max-w-7xl rounded-lg border p-4 sm:p-5 ${style.border} ${style.secondaryBg}`}>
              <div className={`flex flex-wrap gap-x-2 gap-y-1 text-sm ${style.secondaryText}`}>
                <p>
                Role / occupation used as target: <span className={style.primaryText}>{analyzerResume.occupation || "AI will identify it during analysis"}</span>
                </p>
                <p>Source format: {getResumeFormat(analyzerResume.fileName)}</p>
              </div>
              <label className={`mt-4 flex items-start gap-2 text-xs leading-5 ${style.secondaryText}`}>
                <input
                  type="checkbox"
                  checked={analysisConsent}
                  onChange={(event) => setConsentResumeId(event.target.checked ? analyzerResume.id : "")}
                  disabled={Boolean(analyzingResumeId)}
                  className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                />
                <span>I agree to send the selected resume to Applora for analysis. If no occupation is set, the identified occupation will be saved to this resume.</span>
              </label>
              <p className={`mt-3 text-xs leading-5 ${style.mutedText}`}>Applora may temporarily retain paid-service requests for safety or legal purposes. This AI-generated analysis is guidance only and may differ from how recruiters or employers assess your resume; it is not an employment decision.</p>
              {analysisError && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{analysisError}</p>}
              <button type="button" onClick={runAnalysis} disabled={!analysisConsent || Boolean(analyzingResumeId)} className={`mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${style.buttonBlue}`}>
                {analyzing ? "Analyzing resume…" : analysisError ? "Retry analysis" : "Analyze resume"}
              </button>
            </section>
          )}

          {analyzerResume && analysis && reanalysisPromptOpen && (
            <section className={`w-full max-w-3xl border-b pb-4 ${style.border}`}>
              <label className={`flex items-start gap-2 text-xs leading-5 ${style.secondaryText}`}>
                <input
                  type="checkbox"
                  checked={analysisConsent}
                  onChange={(event) => setConsentResumeId(event.target.checked ? analyzerResume.id : "")}
                  className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                />
                <span>I agree to send this resume to Applora again for an updated analysis.</span>
              </label>
              <button type="button" onClick={runAnalysis} disabled={!analysisConsent || Boolean(analyzingResumeId)} className={`mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 sm:w-auto ${style.buttonBlue}`}>
                Confirm re-analysis
              </button>
            </section>
          )}

          {analyzerResume && analyzing && !analysis && (
            <ResumeAnalysisProgress style={style} />
          )}
          {analyzerResume && analysis && (
            <>
              <ResumeAnalysisReport analysis={analysis} />
              <section className={`rounded-lg border p-4 sm:p-5 ${style.border} ${style.secondaryBg}`}>
                <div>
                  <h2 className={`text-base font-semibold ${style.primaryText}`}>ATS-friendly optimized resume</h2>
                  <p className={`mt-1 text-sm ${style.secondaryText}`}>Review the details carefully. This is a one-column text layout.</p>
                </div>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <label className={`block text-sm font-medium ${style.primaryText}`}>
                    Download format
                    <select
                      value={downloadFormat}
                      onChange={(event) => setDownloadFormat(event.target.value)}
                      disabled={downloading}
                      className={`mt-1 block min-h-10 rounded-lg border px-3 py-2 text-sm ${style.input} ${style.inputFocus}`}
                    >
                      <option value="txt">TXT</option>
                      <option value="docx">DOCX</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => void downloadOptimizedResume()}
                    disabled={downloading}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-wait disabled:opacity-60 ${style.buttonBlue}`}
                  >
                    {downloading
                      ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                      : <Download size={16} aria-hidden="true" />}
                    {downloading ? "Preparing download…" : "Download optimized resume"}
                  </button>
                </div>
                <pre className={`mt-4 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg border p-3 font-sans text-sm leading-6 sm:p-4 ${style.border} ${style.secondaryText}`}>{analysis.optimizedResume}</pre>
              </section>
            </>
          )}
        </div>
      )}
    </section>
  );
}