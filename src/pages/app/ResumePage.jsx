import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useStyle } from "../../components/ui/Style";
import PdfDocumentViewer from "../../components/resume/PdfDocumentViewer";
import api from "../../lib/api";
import { uploadResume } from "../../lib/resumes";
import { AlertCircle, Filter, LoaderCircle, MoreHorizontal, RotateCw, Search, Upload, X, SquareArrowOutUpRight } from "lucide-react";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const emptyResumes = [];

function formatUploadedDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function ResumePage() {
  const style = useStyle();
  const [searchParams] = useSearchParams();
  const { resumes: loadedResumes, setResumes, workspaceError, loadWorkspace } = useOutletContext();
  const resumes = loadedResumes || emptyResumes;
  const [analyzerResumeId, setAnalyzerResumeId] = useState("");
  const [resumeQuery, setResumeQuery] = useState("");
  const [resumeSort, setResumeSort] = useState("newest");
  const [reloading, setReloading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [occupation, setOccupation] = useState("");
  const [file, setFile] = useState(null);
  const [previewResume, setPreviewResume] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [previewingId, setPreviewingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const actionMenuRef = useRef(null);
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);
  const uploadingRef = useRef(uploading);
  const autoOpenedResumeId = useRef(null);
  const previewRequestId = useRef(0);
  const previewOpen = Boolean(previewResume);
  const analyzerResume = resumes.find((resume) => resume.id === analyzerResumeId) || resumes[0] || null;
  const filteredResumes = useMemo(() => {
    const query = resumeQuery.trim().toLowerCase();
    return resumes
      .filter((resume) => [resume.fileName, resume.name, resume.occupation]
        .some((value) => String(value || "").toLowerCase().includes(query)))
      .sort((first, second) => {
        if (resumeSort === "name") {
          return (first.fileName || first.name || "").localeCompare(second.fileName || second.name || "");
        }
        const firstDate = new Date(first.uploadedAt || first.createdAt || 0).getTime();
        const secondDate = new Date(second.uploadedAt || second.createdAt || 0).getTime();
        return resumeSort === "oldest" ? firstDate - secondDate : secondDate - firstDate;
      });
  }, [resumes, resumeQuery, resumeSort]);

  useEffect(() => {
    const objectUrl = previewResume?.objectUrl;
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewResume?.objectUrl]);

  const clearForm = useCallback(() => {
    setOccupation("");
    setFile(null);
    setProgress(0);
    setUploadOpen(false);
  }, []);
  const openUpload = () => {
    returnFocusRef.current = document.activeElement;
    setUploadOpen(true);
  };
  const submitUpload = async (event) => {
    event.preventDefault();
    if (!file) {
      toast.error("Choose a resume file.");
      return;
    }
    if (file && (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf"))) {
      toast.error("Choose a PDF file.");
      return;
    }
    if (file && file.size > MAX_FILE_BYTES) {
      toast.error("Resume files must be 8 MB or smaller.");
      return;
    }
    uploadingRef.current = true;
    setUploading(true);
    setProgress(0);
    try {
      const fileNameWithoutExtension = file.name.replace(/\.pdf$/i, "").trim();
      const resume = await uploadResume(file, {
        name: fileNameWithoutExtension || file.name,
        occupation,
      }, (event) => {
        if (event.total) setProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      });
      setResumes((current) => [resume, ...(current || [])]);
      setProgress(100);
      toast.success("Resume uploaded.");
      clearForm();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to upload resume. Please try again.");
    } finally {
      uploadingRef.current = false;
      setUploading(false);
    }
  };

  const closePreview = useCallback(() => {
    previewRequestId.current += 1;
    setPreviewResume(null);
    setPreviewError("");
    setPreviewingId(null);
  }, []);

  const viewResume = useCallback(async (resume) => {
    if (!previewOpen) returnFocusRef.current = document.activeElement;
    const requestId = ++previewRequestId.current;
    autoOpenedResumeId.current = resume.id;
    setPreviewResume(resume);
    setPreviewError("");
    setPreviewingId(resume.id);
    try {
      const [, fileResponse] = await Promise.all([
        import("pdfjs-dist"),
        api.get(`/resumes/${encodeURIComponent(resume.id)}/download`, { responseType: "blob" }),
      ]);
      const pdfFile = fileResponse.data;
      const signature = new Uint8Array(await pdfFile.slice(0, 5).arrayBuffer());
      if (String.fromCharCode(...signature) !== "%PDF-") {
        let message = "The server did not return a valid PDF file.";
        if (pdfFile.type.includes("json")) {
          try {
            const body = JSON.parse(await pdfFile.text());
            message = body.message || message;
          } catch {
            // Keep the generic file validation message for non-JSON responses.
          }
        }
        if (requestId === previewRequestId.current) setPreviewError(message);
        return;
      }
      if (requestId === previewRequestId.current) {
        setPreviewResume({
          ...resume,
          pdfFile,
          objectUrl: URL.createObjectURL(pdfFile),
        });
      }
    } catch (error) {
      if (requestId === previewRequestId.current) {
        setPreviewError(error.response?.data?.message || "Unable to load this resume.");
      }
    } finally {
      if (requestId === previewRequestId.current) setPreviewingId(null);
    }
  }, [previewOpen]);

  useEffect(() => {
    const requestedId = searchParams.get("resumeId");
    const requestedResume = resumes.find((resume) => resume.id === requestedId);
    if (!requestedResume || autoOpenedResumeId.current === requestedResume.id) return;
    void viewResume(requestedResume);
  }, [resumes, searchParams, viewResume]);

  useEffect(() => {
    if (!openMenuId) return undefined;
    const handlePointerDown = (event) => {
      if (!actionMenuRef.current?.contains(event.target)) setOpenMenuId(null);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  useEffect(() => {
    if (!uploadOpen && !previewOpen) return undefined;
    const dialog = dialogRef.current;
    const getFocusableElements = () => Array.from(
      dialog?.querySelectorAll("button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])") || [],
    );
    getFocusableElements()[0]?.focus();

    const handleDialogKeyDown = (event) => {
      if (event.key === "Escape") {
        if (uploadOpen) {
          if (!uploadingRef.current) clearForm();
        } else {
          closePreview();
        }
        return;
      }
      if (event.key !== "Tab") return;
      const focusableElements = getFocusableElements();
      if (!focusableElements.length) {
        event.preventDefault();
        return;
      }
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      document.removeEventListener("keydown", handleDialogKeyDown);
      returnFocusRef.current?.focus?.();
      returnFocusRef.current = null;
    };
  }, [uploadOpen, previewOpen, clearForm, closePreview]);

  const downloadResume = async (resume) => {
    setDownloadingId(resume.id);
    try {
      const response = await api.get(`/resumes/${encodeURIComponent(resume.id)}/download`, {
        responseType: "blob",
      });
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = resume.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to download this resume.");
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteResume = async (resume) => {
    if (!window.confirm(`Delete “${resume.name || resume.fileName}”?`)) return;
    try {
      await api.delete(`/resumes/${encodeURIComponent(resume.id)}`);
      setResumes((current) => current.filter((item) => item.id !== resume.id));
      if (previewResume?.id === resume.id) closePreview();
      toast.success("Resume deleted.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete resume.");
    }
  };

  const reloadResumes = async () => {
    setReloading(true);
    try {
      await loadWorkspace();
    } finally {
      setReloading(false);
    }
  };

  if (workspaceError) return <section className={`mx-auto max-w-xl rounded-xl border p-8 text-center ${style.border} ${style.secondaryBg}`} role="alert"><p className={style.primaryText}>Resume data could not be loaded.</p><p className={`mt-2 text-sm ${style.secondaryText}`}>{workspaceError}</p><button type="button" onClick={loadWorkspace} className={`mt-4 rounded-md px-4 py-2 text-sm ${style.buttonBlue}`}>Try again</button></section>;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={`mb-1 text-2xl sm:text-3xl font-semibold ${style.primaryText}`}>Resume</h1>
          <p className={`text-sm sm:text-base ${style.secondaryText}`}>Manage your uploaded resumes and analyze them with AI.</p>
        </div>
          <button
            type="button"
            onClick={openUpload}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${style.buttonBlue}`}
          >
            <Upload size={17} aria-hidden="true" /> Upload resume
          </button>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <section aria-labelledby="resume-library-title" className="min-w-0">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className={`flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg border px-3 sm:max-w-md ${style.border} ${style.secondaryBg}`}>
              <Search size={17} className={`shrink-0 ${style.mutedText}`} aria-hidden="true" />
              <input
                type="search"
                value={resumeQuery}
                onChange={(event) => setResumeQuery(event.target.value)}
                placeholder="Search resumes"
                aria-label="Search resumes by filename or occupation"
                className={`min-w-0 flex-1 border-0 bg-transparent text-sm outline-none focus:ring-0 ${style.primaryText} ${style.inputPlaceholder}`}
              />
            </label>
            <div className="flex items-center justify-end gap-2">
              <label className={`flex min-h-11 min-w-0 items-center gap-2 rounded-lg border px-3 ${style.border} ${style.secondaryBg}`}>
                <Filter size={16} className={`shrink-0 ${style.mutedText}`} aria-hidden="true" />
                <select
                  value={resumeSort}
                  onChange={(event) => setResumeSort(event.target.value)}
                  aria-label="Sort resumes"
                  className={`min-w-0 flex-1 border-0 bg-transparent py-2 text-sm outline-none focus:ring-0 sm:w-36 ${style.primaryText}`}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Filename A–Z</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void reloadResumes()}
                disabled={reloading}
                aria-label="Reload resumes"
                title="Reload resumes"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${style.border} ${style.primaryText} ${style.hoverBg}`}
              >
                <RotateCw size={17} className={reloading ? "animate-spin" : ""} aria-hidden="true" />
              </button>
            </div>
          </div>
          <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="resume-library-title" className={`text-base font-semibold ${style.primaryText}`}>Your resumes</h2>
            <p className={`text-sm ${style.secondaryText}`} aria-live="polite">
              {filteredResumes.length} {filteredResumes.length === 1 ? "resume" : "resumes"}
            </p>
          </header>
          {filteredResumes.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredResumes.map((item, index) => (
                <article
                  key={item.id}
                  className={`relative flex min-w-0 cursor-pointer flex-col gap-4 rounded-md border p-4 transition-colors lg:flex-row lg:items-start ${style.border} ${style.secondaryBg} ${style.isDarkMode ? "hover:border-[#4A4A4A]" : "hover:border-[#B5B5B5]"}`}
                >
                  <button
                    type="button"
                    onClick={() => void viewResume(item)}
                    disabled={previewingId === item.id}
                    aria-label={`Open ${item.fileName || item.name || "resume"}`}
                    className="absolute inset-0 z-10 cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 disabled:cursor-wait"
                  />
                  <div className="relative z-0 flex min-w-0 flex-1 items-start gap-3">
                    <div className="min-w-0 flex-1 pl-1">
                      <p className={`truncate text-sm font-semibold ${style.primaryText}`}>{item.fileName || "Filename unavailable"}</p>
                      <p className={`mt-1 truncate text-xs ${style.secondaryText}`}>Occupation for: {item.occupation || "Not specified"}</p>
                      <p className={`mt-1.5 text-xs ${style.mutedText}`}>Uploaded {formatUploadedDate(item.uploadedAt || item.createdAt)}</p>
                    </div>
                  </div>
                  <div className="relative z-20 flex shrink-0 items-center self-end lg:self-auto">
                    <div className="relative" ref={openMenuId === item.id ? actionMenuRef : null}>
                      <button
                        type="button"
                        aria-label={`Actions for ${item.name || item.fileName || "untitled resume"}`}
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === item.id}
                        onClick={() => setOpenMenuId((current) => current === item.id ? null : item.id)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${style.secondaryText} ${style.hoverBg}`}
                      >
                        <MoreHorizontal size={18} aria-hidden="true" />
                      </button>
                      {openMenuId === item.id && (
                        <div role="menu" className={`absolute right-0 ${index === filteredResumes.length - 1 ? "bottom-full mb-1" : "top-full mt-1"} z-20 w-40 rounded-lg border p-1 shadow-lg ${style.border} ${style.secondaryBg}`}>
                          <button
                            type="button"
                            role="menuitem"
                            disabled={downloadingId === item.id}
                            onClick={() => {
                              setOpenMenuId(null);
                              void downloadResume(item);
                            }}
                            className={`flex w-full items-center rounded-md px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${style.primaryText} ${style.hoverBg} disabled:opacity-60`}
                          >
                            {downloadingId === item.id ? "Downloading…" : "Download"}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuId(null);
                              void deleteResume(item);
                            }}
                            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={`px-5 py-12 sm:py-24 text-center `}>
              {resumes.length === 0 ? (
                <>
                  <h3 className={`text-sm font-semibold ${style.primaryText}`}>No resumes yet</h3>
                  <p className={`mx-auto mt-1 max-w-xs text-sm ${style.secondaryText}`}>Upload a PDF to keep your job search documents in one place.</p>
                  <button type="button" onClick={openUpload} className={`mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${style.buttonBlue}`}>
                    <Upload size={16} aria-hidden="true" /> Upload resume
                  </button>
                </>
              ) : (
                <>
                  <h3 className={`text-sm font-semibold ${style.primaryText}`}>No matching resumes</h3>
                  <p className={`mx-auto mt-1 max-w-xs text-sm ${style.secondaryText}`}>Try a different filename or occupation.</p>
                </>
              )}
            </div>
          )}
        </section>

        <aside className="min-w-0">
          <section aria-labelledby="resume-analyzer-title" className={`rounded-md border p-4 sm:p-5 ${style.border} ${style.secondaryBg}`}>
            <header>
              <h2 id="resume-analyzer-title" className={`text-lg font-semibold leading-6 ${style.primaryText}`}>AI resume analyzer</h2>
              <p className={`mt-2 text-sm leading-5 ${style.secondaryText}`}>Choose a resume to analyze.</p>
            </header>
            <div className="mt-4 space-y-4">
              <label htmlFor="analyzer-resume" className={`block text-sm font-medium ${style.primaryText}`}>
                Resume
                <select
                  id="analyzer-resume"
                  value={analyzerResume?.id || ""}
                  onChange={(event) => setAnalyzerResumeId(event.target.value)}
                  disabled={resumes.length === 0}
                  className={`mt-1.5 block min-h-11 w-full rounded-lg border px-3 py-2 text-sm ${style.input} ${style.inputFocus} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {resumes.length === 0 ? (
                    <option value="">Upload a resume to select it</option>
                  ) : resumes.map((resume) => (
                    <option key={resume.id} value={resume.id}>
                      {resume.fileName || resume.name || "Untitled resume"}
                    </option>
                  ))}
                </select>
              </label>
              {analyzerResume && (
                <p className={`truncate text-xs ${style.secondaryText}`} title={analyzerResume.occupation || "Occupation not specified"}>
                  Occupation for: {analyzerResume.occupation || "Not specified"}
                </p>
              )}
              <div role="status" className={`flex items-start gap-3 rounded-lg border p-3 ${style.border} ${style.isDarkMode ? "bg-amber-500/10" : "bg-amber-50"}`}>
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <div>
                  <p className={`text-sm font-semibold ${style.primaryText}`}>Under maintenance</p>
                  <p className={`mt-1 text-xs leading-5 ${style.secondaryText}`}>Resume analysis is temporarily unavailable. Your selected resume will be ready when this feature returns.</p>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {uploadOpen && <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !uploading) clearForm(); }}>
        <section
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-resume-title"
          aria-describedby="upload-resume-description"
          className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border p-5 sm:p-6 ${style.border} ${style.secondaryBg}`}
        >
          <h2 id="upload-resume-title" className={`text-lg font-semibold ${style.primaryText}`}>Upload resume</h2>
          <p id="upload-resume-description" className={`mt-1 text-sm ${style.secondaryText}`}>PDF files up to 8 MB.</p>
          <form onSubmit={submitUpload} className="mt-5 space-y-4">
            <label className={`block text-sm font-medium ${style.primaryText}`}>
              Occupation
              <input
                maxLength={120}
                value={occupation}
                onChange={(event) => setOccupation(event.target.value)}
                className={`mt-1.5 block min-h-11 w-full rounded-lg border px-3 py-2 text-sm ${style.input} ${style.inputFocus}`}
                placeholder="e.g. Product Designer"
              />
            </label>
            <label className={`block text-sm font-medium ${style.primaryText}`}>
              Resume file
              <input
                required
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className={`mt-1.5 block min-h-11 w-full rounded-lg border px-3 py-2 text-sm ${style.input} ${style.inputFocus} file:mr-3 file:rounded-md file:border-0 file:bg-blue-500/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 dark:file:text-blue-300`}
              />
              {file && <span className={`mt-1.5 block truncate text-xs font-normal ${style.secondaryText}`}>Selected: {file.name}</span>}
            </label>
            {uploading && (
              <div aria-live="polite">
                <p className={`text-xs ${style.secondaryText}`}>Uploading… {progress}%</p>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            <div className="flex flex-col-reverse justify-end gap-2 pt-1 sm:flex-row">
              <button
                type="button"
                disabled={uploading}
                onClick={clearForm}
                className={`min-h-10 rounded-lg border px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${style.border} ${style.secondaryButton}`}
              >
                Cancel
              </button>
              <button
                disabled={uploading}
                type="submit"
                className={`min-h-10 rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 ${style.buttonBlue}`}
              >
                {uploading ? "Uploading…" : "Upload resume"}
              </button>
            </div>
          </form>
        </section>
      </div>}

      {previewResume && <div className="modal-overlay">
        <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="resume-preview-title" aria-busy={previewingId === previewResume.id} className={`flex h-[min(90vh,900px)] w-full max-w-5xl flex-col rounded-xl border p-4 ${style.border} ${style.secondaryBg}`}>
          <header className="mb-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
                <h2
                  id="resume-preview-title"
                className={`truncate text-lg font-semibold ${style.primaryText}`}
              >
                  {previewResume.name || previewResume.fileName}
              </h2>
                <p className={`truncate text-sm ${style.secondaryText}`}>
                  {previewResume.fileName} · {previewResume.occupation || "Occupation not specified"}
                </p>
              </div>
              {previewResume.objectUrl && (
                <a
                  href={previewResume.objectUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open resume in a new tab"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${style.primaryText} ${style.hoverBg}`}
                >
                  <SquareArrowOutUpRight size={16} aria-hidden="true" />
                </a>
              )}
              <button
                type="button"
                onClick={closePreview}
                aria-label="Close resume preview"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${style.closeButton}`}
            >
              <X size={18} aria-hidden="true" />
              </button>
          </header>
          {previewingId === previewResume.id && !previewResume.pdfFile ? (
            <div className={`flex min-h-0 flex-1 items-center justify-center rounded-lg border ${style.border} ${style.secondaryBg}`} role="status">
              <div className={`flex items-center gap-3 text-sm ${style.secondaryText}`}>
                <LoaderCircle size={20} className="animate-spin text-blue-600 dark:text-blue-400" aria-hidden="true" />
                Loading resume…
              </div>
            </div>
          ) : previewError ? (
            <div className={`flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-lg border p-6 text-center ${style.border} ${style.secondaryBg}`} role="alert">
              <p className={`text-sm ${style.secondaryText}`}>{previewError}</p>
              <button
                type="button"
                onClick={() => void viewResume(previewResume)}
                className={`min-h-10 rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${style.buttonBlue}`}
              >
                Try again
              </button>
            </div>
          ) : previewResume.pdfFile ? (
            <PdfDocumentViewer file={previewResume.pdfFile} style={style} />
          ) : null}
        </section>
      </div>}
    </div>
  );
}
