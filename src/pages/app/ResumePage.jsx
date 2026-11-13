import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useStyle } from "../../components/ui/Style";
import PdfDocumentViewer from "../../components/resume/PdfDocumentViewer";
import ResumeAnalyzerDrawer from "../../components/resume/ResumeAnalyzerDrawer";
import api from "../../lib/api";
import { uploadResume } from "../../lib/resumes";
import { Check, ChevronDown, Filter, LoaderCircle, MoreHorizontal, Search, Sparkles, Upload, X, SquareArrowOutUpRight } from "lucide-react";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const emptyResumes = [];
const allowedResumeMimeTypes = {
  pdf: ["application/pdf", "application/octet-stream"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"],
  txt: ["text/plain", "application/octet-stream"],
};
const resumeSortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Filename A–Z" },
];

function getResumeExtension(fileName) {
  return String(fileName || "").toLowerCase().split(".").pop();
}

function isSupportedResumeFile(file) {
  const extension = getResumeExtension(file?.name);
  return Boolean(
    allowedResumeMimeTypes[extension]
    && (!file.type || allowedResumeMimeTypes[extension].includes(file.type))
  );
}

function formatUploadedDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(date);
}

function ResumeSortDropdown({ value, onChange, style }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedOption = resumeSortOptions.find((option) => option.value === value) || resumeSortOptions[0];

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative min-w-0">
      <button
        type="button"
        aria-label="Sort resumes"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex min-h-10 min-w-0 items-center gap-2 rounded-md border px-3 text-sm transition ${style.border} ${style.secondaryBg} ${style.primaryText} ${style.secondaryBgHover}`}
      >
        <Filter size={15} aria-hidden="true" className={`shrink-0 ${style.mutedText}`} />
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown size={14} aria-hidden="true" className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label="Sort resumes"
          className={`absolute right-0 top-full z-30 mt-1.5 w-max min-w-full overflow-hidden rounded-lg border p-1 shadow-lg ${style.border} ${style.secondaryBg}`}
        >
          {resumeSortOptions.map((option) => {
            const selected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex min-h-10 w-full items-center gap-3 whitespace-nowrap rounded-md px-2.5 py-2 text-left text-sm transition ${
                  selected
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                    : `${style.primaryText} ${style.hoverBg}`
                }`}
              >
                <span className="flex-1">{option.label}</span>
                {selected && <Check size={15} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResumePageSkeleton({ style }) {
  const placeholder = "animate-pulse rounded bg-slate-200 dark:bg-[#333333]";

  return (
    <section className="mx-auto w-full max-w-7xl" aria-label="Loading resumes" aria-busy="true">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={`mb-1 text-2xl font-semibold sm:text-3xl ${style.primaryText}`}>Resume</h1>
          <p className={`text-sm sm:text-base ${style.secondaryText}`}>Manage your uploaded resumes and analyze them with AI.</p>
        </div>
        <div className={`h-9 w-32 rounded-md ${placeholder}`} />
      </header>

      <div>
        <section aria-label="Resume library loading" className="min-w-0">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className={`h-9 w-9 shrink-0 rounded-md ${placeholder}`} />
              <div className={`h-9 w-full rounded-md sm:max-w-md ${placeholder}`} />
            </div>
            <div className={`h-10 w-36 self-end rounded-md sm:self-auto ${placeholder}`} />
          </div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <article
                key={index}
                className={`flex h-[72px] min-w-0 items-start gap-3 rounded-md border p-4 ${style.border} ${style.secondaryBg}`}
              >
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className={`h-3 w-3/4 ${placeholder}`} />
                  <div className={`h-2.5 w-2/3 ${placeholder}`} />
                  <div className={`h-2.5 w-4/5 ${placeholder}`} />
                </div>
                <div className={`h-7 w-7 shrink-0 rounded-md ${placeholder}`} />
              </article>
            ))}
          </div>
        </section>

      </div>
      <span className="sr-only">Loading resumes…</span>
    </section>
  );
}

export default function ResumePage() {
  const style = useStyle();
  const [searchParams, setSearchParams] = useSearchParams();
  const { resumes: loadedResumes, setResumes, workspaceError, loadWorkspace } = useOutletContext();
  const isLoading = !Array.isArray(loadedResumes);
  const resumes = Array.isArray(loadedResumes) ? loadedResumes : emptyResumes;
  const [resumeQuery, setResumeQuery] = useState("");
  const [resumeSort, setResumeSort] = useState("newest");
  const [analyzerPickerOpen, setAnalyzerPickerOpen] = useState(false);
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
  const analyzerPickerRef = useRef(null);
  const actionMenuRef = useRef(null);
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);
  const uploadingRef = useRef(uploading);
  const autoOpenedResumeId = useRef(null);
  const previewRequestId = useRef(0);
  const previewOpen = Boolean(previewResume);
  const analyzerResumeId = searchParams.get("analyze") || "";
  const analyzerResume = resumes.find((resume) => resume.id === analyzerResumeId) || null;
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
    if (file && !isSupportedResumeFile(file)) {
      toast.error("Choose a PDF, DOCX, or TXT resume.");
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
      const fileNameWithoutExtension = file.name.replace(/\.[^.]+$/, "").trim();
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

  const openAnalyzer = useCallback((resume) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("analyze", resume.id);
    setSearchParams(nextParams);
    setAnalyzerPickerOpen(false);
  }, [searchParams, setSearchParams]);

  const closeAnalyzer = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("analyze");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const viewResume = useCallback(async (resume) => {
    if (!previewOpen) returnFocusRef.current = document.activeElement;
    const requestId = ++previewRequestId.current;
    autoOpenedResumeId.current = resume.id;
    setPreviewResume(resume);
    setPreviewError("");
    setPreviewingId(resume.id);
    try {
      const response = await api.get(`/resumes/${encodeURIComponent(resume.id)}/download`, { responseType: "blob" });
      const resumeFile = response.data;
      const extension = getResumeExtension(resume.fileName);
      let documentText;
      if (extension === "pdf") {
        const signature = new Uint8Array(await resumeFile.slice(0, 5).arrayBuffer());
        if (String.fromCharCode(...signature) !== "%PDF-") throw new Error("The server did not return a valid PDF file.");
      } else if (extension === "docx") {
        const mammothModule = await import("mammoth");
        const mammoth = mammothModule.default || mammothModule;
        const result = await mammoth.extractRawText({ arrayBuffer: await resumeFile.arrayBuffer() });
        documentText = result.value.trim();
        if (!documentText) throw new Error("No readable text was found in this DOCX file.");
      } else if (extension === "txt") {
        documentText = new TextDecoder("utf-8", { fatal: true }).decode(await resumeFile.arrayBuffer()).trim();
        if (!documentText) throw new Error("This TXT file is empty.");
      } else {
        throw new Error("This resume format cannot be previewed.");
      }

      const objectUrl = URL.createObjectURL(resumeFile);
      if (requestId === previewRequestId.current) {
        setPreviewResume({ ...resume, pdfFile: extension === "pdf" ? resumeFile : null, documentText, objectUrl });
      } else {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (error) {
      if (requestId === previewRequestId.current) {
        setPreviewError(error.response?.data?.message || error.message || "Unable to load this resume.");
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
    if (!analyzerPickerOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!analyzerPickerRef.current?.contains(event.target)) setAnalyzerPickerOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setAnalyzerPickerOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [analyzerPickerOpen]);

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

  if (isLoading) return <ResumePageSkeleton style={style} />;
  if (workspaceError) return <section className={`mx-auto max-w-xl rounded-xl border p-8 text-center ${style.border} ${style.secondaryBg}`} role="alert"><p className={style.primaryText}>Resume data could not be loaded.</p><p className={`mt-2 text-sm ${style.secondaryText}`}>{workspaceError}</p><button type="button" onClick={loadWorkspace} className={`mt-4 rounded-md px-4 py-2 text-sm ${style.buttonBlue}`}>Try again</button></section>;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={`mb-1 text-2xl sm:text-3xl font-semibold ${style.primaryText}`}>Resume</h1>
          <p className={`text-sm sm:text-base ${style.secondaryText}`}>Manage your uploaded resumes and analyze them with AI.</p>
        </div>
          
      </div>

      <div>
        <section aria-labelledby="resume-library-title" className="min-w-0">
          <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Search + sort */}
              <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:max-w-xl">
                <label
                  className={`flex w-full min-w-0 flex-1 items-center gap-2 rounded-md border px-3 py-2 ${style.border} ${style.secondaryBg}`}
                >
                  <Search size={16} className={`shrink-0 ${style.mutedText}`} aria-hidden="true" />
                  <input
                    type="search"
                    value={resumeQuery}
                    onChange={(event) => setResumeQuery(event.target.value)}
                    placeholder="Search resumes"
                    aria-label="Search resumes by filename or occupation"
                    className={`min-w-0 flex-1 border-0 bg-transparent text-sm outline-none focus:ring-0 ${style.primaryText} ${style.inputPlaceholder}`}
                  />
                </label>
                <div className="shrink-0 sm:w-auto">
                  <ResumeSortDropdown value={resumeSort} onChange={setResumeSort} style={style} />
                </div>
              </div>

              {/* Actions */}
              <div className="relative grid grid-cols-2 gap-2 sm:flex sm:shrink-0" ref={analyzerPickerRef}>
                <button
                  type="button"
                  onClick={() => setAnalyzerPickerOpen((open) => !open)}
                  aria-haspopup="dialog"
                  aria-expanded={analyzerPickerOpen}
                  className={`inline-flex py-2 shrink-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold  ${style.buttonIndigo} `}
                >
                  <Sparkles size={16} aria-hidden="true" /> AI analyzer
                </button>

                {analyzerPickerOpen && (
                  <div
                    role="dialog"
                    aria-label="Choose a resume to analyze"
                    className={`absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border p-3 shadow-xl sm:left-auto sm:right-0 ${style.border} ${style.secondaryBg}`}
                  >
                    <h2 className={`px-2 pb-2 text-sm font-semibold ${style.primaryText}`}>Which resume?</h2>
                    {resumes.length ? (
                      <ul className="max-h-64 space-y-1 overflow-y-auto">
                        {resumes.map((resume) => (
                          <li key={resume.id}>
                            <button
                              type="button"
                              onClick={() => openAnalyzer(resume)}
                              className={`w-full rounded-lg px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${style.hoverBg}`}
                            >
                              <span className={`block truncate text-sm font-medium ${style.primaryText}`}>
                                {resume.fileName || resume.name || "Untitled resume"}
                              </span>
                              <span className={`mt-0.5 block truncate text-xs ${style.secondaryText}`}>
                                {resume.occupation || "Occupation not specified"}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={`px-2 py-2 text-sm ${style.secondaryText}`}>Upload a resume to get started.</p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={openUpload}
                   className={`inline-flex py-2 shrink-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold  ${style.buttonBlue}`}
                >
                  <Upload size={16} aria-hidden="true" /> Upload resume
                </button>
              </div>
            </div>
          {filteredResumes.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              {filteredResumes.map((item, index) => (
                <article
                  key={item.id}
                  className={`relative flex min-w-0 cursor-pointer flex-col gap-4 rounded-lg border p-5  transition-colors lg:flex-row lg:items-start ${analyzerResumeId === item.id ? "border-blue-500 ring-2 ring-blue-500/20" : style.border} ${style.secondaryBg} ${style.isDarkMode ? "hover:border-[#4A4A4A]" : "hover:border-[#B5B5B5]"}`}
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
                      <p className={`mt-1 truncate text-xs font-medium ${style.secondaryText}`}>{item.occupation || "Occupation not specified"}</p>
                  
                      <p className={`mt-1.5 text-xs ${style.mutedText}`}>{formatUploadedDate(item.uploadedAt || item.createdAt)}</p>
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
                        <div role="menu" className={`absolute right-0 ${index === filteredResumes.length - 1 ? "bottom-full mb-1" : "top-full mt-1"} z-20 w-40 rounded-md border  shadow-lg ${style.border} ${style.secondaryBg}`}>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuId(null);
                              openAnalyzer(item);
                            }}
                            className={`flex w-full items-center rounded-t-md px-3 py-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${style.primaryText} ${style.hoverBg}`}
                          >
                            Analyze
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            disabled={downloadingId === item.id}
                            onClick={() => {
                              setOpenMenuId(null);
                              void downloadResume(item);
                            }}
                            className={`flex w-full items-center px-3 py-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${style.primaryText} ${style.hoverBg} disabled:opacity-60`}
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
                            className={`flex w-full items-center rounded-b-md px-3 py-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${style.primaryText} ${style.hoverBg}`}
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
                  <h3 className={`text-lg font-semibold ${style.primaryText}`}>No resumes yet</h3>
                  <p className={`mx-auto mt-1 max-w-xs text-sm ${style.secondaryText}`}>Upload a PDF, DOCX, or TXT resume to keep your job search documents in one place.</p>
                  
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
          <p id="upload-resume-description" className={`mt-1 text-sm ${style.secondaryText}`}>PDF, DOCX, or TXT files up to 8 MB.</p>
          <form onSubmit={submitUpload} className="mt-5 space-y-4">
            <label className={`block text-sm font-medium ${style.primaryText}`}>
              Occupation <span className={`font-normal ${style.mutedText}`}>(optional; AI can identify it after analysis)</span>
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
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
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
                  target={previewResume.pdfFile ? "_blank" : undefined}
                  download={previewResume.pdfFile ? undefined : previewResume.fileName}
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
          {previewingId === previewResume.id && !previewResume.pdfFile && !previewResume.documentText ? (
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
          ) : previewResume.documentText ? (
            <pre className={`min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-lg border p-5 text-sm leading-6 ${style.border} ${style.secondaryText}`}>
              {previewResume.documentText}
            </pre>
          ) : null}
        </section>
      </div>}
      <ResumeAnalyzerDrawer
        resume={analyzerResume}
        open={Boolean(analyzerResumeId && analyzerResume)}
        onClose={closeAnalyzer}
        setResumes={setResumes}
      />
    </div>
  );
}
