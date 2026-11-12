import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowDownUp, Check, ChevronsUpDown, ChevronDown, ChevronUp, MoreHorizontal, Pencil, BadgePlus, Search, Trash2 } from "lucide-react";
import { useStyle } from "../../components/ui/Style";
import ApplicationModal from "../../components/modal/ApplicationModal";
import DeleteApplicationModal from "../../components/modal/DeleteApplicationModal";
import { StatusBadge } from "./DashboardPage";
import api from "../../lib/api";
import { uploadResume } from "../../lib/resumes";

const statusLabels = ["Applied", "In review", "Interview", "Offer", "Closed"];
const sortOptions = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "company-asc", label: "Company A–Z" },
  { value: "role-asc", label: "Job title A–Z" },
];
const emptyApplications = [];
const statusTone = {
  Applied: "blue",
  Interview: "purple",
  "In review": "orange",
  Offer: "green",
  Closed: "gray",
};

function SortDropdown({ value, onChange, style }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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
    <div ref={dropdownRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Sort applications"
        onClick={() => setIsOpen((open) => !open)}
        className={`flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm transition ${style.input} ${style.hoverBg}`}
      >
        <ArrowDownUp size={16} aria-hidden="true" />
        <span className="hidden whitespace-nowrap sm:inline">Sort</span>
        <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label="Sort applications"
          className={`absolute right-0 top-full z-30 mt-1.5 w-52 overflow-hidden rounded-lg border p-1 shadow-lg ${style.border} ${style.secondaryBg}`}
        >
          {sortOptions.map((option) => {
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
                className={`flex min-h-11 w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition ${
                  selected
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                    : `${style.primaryText} ${style.hoverBg}`
                }`}
              >
                <span className="flex-1">{option.label}</span>
                {selected && <Check size={15} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getDisplayStatus(status) {
  if (status === "Screening" || status === "Under Review") return "In review";
  if (status === "Accepted") return "Offer";
  if (status === "Rejected" || status === "Withdrawn") return "Closed";
  return status;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatSalary(application) {
  const { salaryMin, salaryMax, salaryCurrency, salaryPeriod = "month" } = application;
  if (!salaryMin && !salaryMax) return "—";

  const formatAmount = (value) => new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: salaryCurrency || "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));
  const range = salaryMin && salaryMax
    ? `${formatAmount(salaryMin)} – ${formatAmount(salaryMax)}`
    : formatAmount(salaryMin || salaryMax);
  const period = { hour: "/hr", month: "/mo", year: "/yr" }[salaryPeriod] || "";
  return `${range}${period ? ` ${period}` : ""}`;
}

function ApplicationActionsMenu({ application, style, isOpen, onToggle, actionMenuRef, onEdit, onDelete }) {
  return (
    <div className="relative flex shrink-0 justify-center" ref={isOpen ? actionMenuRef : null}>
      <button
        type="button"
        aria-label={`Actions for ${application.role} at ${application.company}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        className={`flex h-11 w-11 items-center justify-center rounded-md ${style.secondaryText} ${style.hoverBg}`}
      >
        <MoreHorizontal size={18} />
      </button>
      {isOpen && (
        <div
          role="menu"
          onClick={(event) => event.stopPropagation()}
          className={`absolute right-0 top-full z-20 mt-1 w-48 rounded-md border p-1 shadow-lg ${style.border} ${style.secondaryBg}`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={onEdit}
            className={`flex min-h-11 w-full items-center gap-2 rounded px-3 py-2 text-left text-sm ${style.primaryText} ${style.hoverBg}`}
          >
            <Pencil size={14} /> Edit application
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={onDelete}
            className="flex min-h-11 w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 dark:text-red-400"
          >
            <Trash2 size={14} /> Delete application
          </button>
        </div>
      )}
    </div>
  );
}

function SortableHeader({ label, sortKey, activeSortKey, sortDirection, onSort, style }) {
  const active = sortKey === activeSortKey;
  const SortIcon = !active ? ChevronsUpDown : sortDirection === "asc" ? ChevronUp : ChevronDown;
  return (
    <th scope="col" aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"} className="px-3 py-3 text-left">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded px-1 text-xs font-semibold uppercase tracking-wide ${active ? "text-blue-700 dark:text-blue-300" : style.secondaryText} ${style.hoverBg}`}
      >
        {label}
        <SortIcon size={14} aria-hidden="true" />
      </button>
    </th>
  );
}

export default function ApplicationsPage() {
  const style = useStyle();
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchQuery = "", applications: loadedApplications, setApplications, resumes: loadedResumes, setResumes, workspaceError, loadWorkspace } = useOutletContext();
  const loading = !Array.isArray(loadedApplications);
  const applications = loadedApplications || emptyApplications;
  const resumes = Array.isArray(loadedResumes) ? loadedResumes : [];
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("dateApplied");
  const [sortDirection, setSortDirection] = useState("desc");
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get("add") === "true");
  const [editingApplication, setEditingApplication] = useState(null);
  const [deletingApplication, setDeletingApplication] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const actionMenuRef = useRef(null);
  const sortValue = sortKey === "company" && sortDirection === "asc"
    ? "company-asc"
    : sortKey === "role" && sortDirection === "asc"
      ? "role-asc"
      : sortKey === "dateApplied"
        ? (sortDirection === "asc" ? "date-asc" : "date-desc")
        : "";
  const combinedQuery = `${query} ${searchQuery}`.trim().toLowerCase();
  const visibleApplications = useMemo(
    () => applications
      .filter((app) => {
        if (app.archived) return false;
        const searchable = [
          app.role, app.company, app.location, app.workSetup, app.status,
          app.source, app.salaryCurrency, app.salaryMin, app.salaryMax, app.notes,
          app.contactName, app.contactEmail,
        ].join(" ").toLowerCase();
        return searchable.includes(combinedQuery);
      })
      .sort((left, right) => {
        const leftValue = sortKey === "salary"
          ? Number(left.salaryMin || left.salaryMax || 0)
          : sortKey === "status"
            ? getDisplayStatus(left.status)
            : String(left[sortKey] || "");
        const rightValue = sortKey === "salary"
          ? Number(right.salaryMin || right.salaryMax || 0)
          : sortKey === "status"
            ? getDisplayStatus(right.status)
            : String(right[sortKey] || "");
        const comparison = typeof leftValue === "number"
          ? leftValue - rightValue
          : leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: "base" });
        return sortDirection === "asc" ? comparison : -comparison;
      }),
    [applications, combinedQuery, sortDirection, sortKey],
  );
  const closeApplicationModal = () => {
    setIsModalOpen(false);
    setEditingApplication(null);
    if (searchParams.has("add")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("add");
      setSearchParams(nextParams, { replace: true });
    }
  };
  const statusCounts = useMemo(
    () => Object.fromEntries(statusLabels.map((status) => [
      status,
      applications.filter((application) => !application.archived && getDisplayStatus(application.status) === status).length,
    ])),
    [applications],
  );
  const setSort = (key) => {
    if (sortKey === key) {
      setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDirection(key === "dateApplied" ? "desc" : "asc");
  };
  const applySortOption = (option) => {
    if (option === "company-asc" || option === "role-asc") {
      setSortKey(option === "company-asc" ? "company" : "role");
      setSortDirection("asc");
      return;
    }
    setSortKey("dateApplied");
    setSortDirection(option === "date-asc" ? "asc" : "desc");
  };

  const saveApplication = async (application) => {
    try {
      const previous = applications.find((item) => item.id === application.id);
      const savePayload = { ...application };
      const response = previous
        ? await api.patch(`/applications/${encodeURIComponent(application.id)}`, savePayload)
        : await api.post("/applications", savePayload);
      const saved = response.data.application;
      setApplications((current) => previous
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current]);
      closeApplicationModal();
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

  const handleEditApplication = (application) => {
    setOpenMenuId(null);
    setEditingApplication(application);
    setIsModalOpen(true);
  };
  const handleDeleteApplication = (application) => {
    setOpenMenuId(null);
    setDeletingApplication(application);
  };

  if (loading) return <div className={`mx-auto w-full max-w-7xl py-12 text-center ${style.secondaryText}`} role="status">Loading applications…</div>;
  if (workspaceError) return <section className={`mx-auto max-w-xl rounded-xl border p-8 text-center ${style.border} ${style.secondaryBg}`} role="alert"><p className={style.primaryText}>Applications could not be loaded.</p><p className={`mt-2 text-sm ${style.secondaryText}`}>{workspaceError}</p><button type="button" onClick={loadWorkspace} className={`mt-4 rounded-md px-4 py-2 text-sm ${style.buttonBlue}`}>Try again</button></section>;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-6 flex items-center justify-between gap-3 sm:mb-8">
        <div className="min-w-0">
          <h1 className={`text-2xl font-semibold tracking-tight sm:text-3xl ${style.primaryText}`}>Applications</h1>
          <p className={`mt-1 text-sm ${style.secondaryText}`}>Keep track of your job search.</p>
        </div>
      </header>

      <section aria-label="Application totals by status" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <article className={`min-w-0 rounded-xl border p-3.5 shadow-sm sm:p-4 ${style.border} ${style.tableBg}`}>
          <p className={`truncate text-xs font-medium ${style.secondaryText}`}>Total applications</p>
          <p className={`mt-2 text-2xl font-semibold tabular-nums ${style.primaryText}`}>
            {applications.filter((application) => !application.archived).length}
          </p>
        </article>
        {statusLabels.map((status) => (
          <article key={status} className={`min-w-0 rounded-xl border p-3.5 shadow-sm sm:p-4 ${style.border} ${style.tableBg}`}>
            <p className={`truncate text-xs font-medium ${style.secondaryText}`}>{status}</p>
            <p className={`mt-2 text-2xl font-semibold tabular-nums ${style.primaryText}`}>{statusCounts[status]}</p>
          </article>
        ))}
      </section>

      <div className="mb-5 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <label className={`flex h-11 min-w-0 w-full rounded-lg border px-3.5 sm:max-w-md ${style.input} ${style.border}`}>
          <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <Search size={17} className={`shrink-0 ${style.mutedText}`} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search roles or companies"
            aria-label="Search roles or companies"
            className="w-full min-w-0 bg-transparent text-sm outline-none"
          />
          </span>
        </label>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <SortDropdown value={sortValue} onChange={applySortOption} style={style} />
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold sm:px-4 ${style.buttonBlue}`}
          >
            <BadgePlus size={18} aria-hidden="true" />
            <span>Add application</span>
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between text-xs">
        <p className={style.secondaryText}>{visibleApplications.length} {visibleApplications.length === 1 ? "application" : "applications"}</p>
      </div>

      <section aria-label="Applications list" className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 min-[1025px]:hidden">
        {visibleApplications.map((app) => {
          const displayStatus = getDisplayStatus(app.status);
          return (
            <article key={app.id} className={`min-w-0 rounded-xl border p-4 shadow-sm ${style.border} ${style.tableBg}`}>
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`truncate text-sm font-medium ${style.secondaryText}`} title={app.company}>{app.company}</p>
                  <Link
                    to={`/applications/${encodeURIComponent(app.id)}`}
                    title={app.role}
                    className={`mt-1 block truncate text-base font-semibold hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${style.primaryText}`}
                  >
                    {app.role}
                  </Link>
                </div>
                <ApplicationActionsMenu
                  application={app}
                  style={style}
                  isOpen={openMenuId === app.id}
                  onToggle={() => setOpenMenuId((current) => current === app.id ? null : app.id)}
                  actionMenuRef={actionMenuRef}
                  onEdit={() => handleEditApplication(app)}
                  onDelete={() => handleDeleteApplication(app)}
                />
              </div>
              <div className={`mt-4 grid min-w-0 grid-cols-2 gap-x-3 gap-y-3 border-t pt-3 ${style.border}`}>
                <div className="min-w-0">
                  <p className={`text-[10px] font-semibold uppercase tracking-wide ${style.mutedText}`}>Location</p>
                  <p className={`mt-1 truncate text-sm ${style.primaryText}`} title={app.location || ""}>{app.location || "—"}</p>
                </div>
                <div className="min-w-0">
                  <p className={`text-[10px] font-semibold uppercase tracking-wide ${style.mutedText}`}>Work setup</p>
                  <p className={`mt-1 truncate text-sm ${style.primaryText}`} title={app.workSetup || ""}>{app.workSetup || "—"}</p>
                </div>
                <div className="min-w-0">
                  <p className={`text-[10px] font-semibold uppercase tracking-wide ${style.mutedText}`}>Salary range</p>
                  <p className={`mt-1 truncate text-sm ${style.primaryText}`} title={formatSalary(app)}>{formatSalary(app)}</p>
                </div>
                <div className="min-w-0">
                  <p className={`text-[10px] font-semibold uppercase tracking-wide ${style.mutedText}`}>Date applied</p>
                  <p className={`mt-1 truncate text-sm ${style.primaryText}`}>{formatDate(app.dateApplied)}</p>
                </div>
                <div className="col-span-2 pt-1">
                  <StatusBadge tone={statusTone[displayStatus] || "gray"}>{displayStatus}</StatusBadge>
                </div>
              </div>
            </article>
          );
        })}
        {visibleApplications.length === 0 && (
          <div className={`col-span-full rounded-xl border px-4 py-12 text-center text-sm ${style.border} ${style.secondaryBg} ${style.secondaryText}`}>
            {applications.length === 0 ? "No applications yet. Add one to get started." : "No applications match your search or filters."}
          </div>
        )}
      </section>

      <section aria-label="Applications table" className={`hidden min-w-0 overflow-x-auto rounded-xl border shadow-sm min-[1025px]:block ${style.border} ${style.tableBg}`}>
        <table className="w-full min-w-[68rem] table-fixed border-collapse text-sm">
          <caption className="sr-only">Your job applications. Select a column heading to sort.</caption>
          <colgroup>
            <col className="w-[14%]" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[11%]" />
            <col className="w-[17%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[4%]" />
          </colgroup>
          <thead className={`${style.tableHeader}`}>
            <tr className={`border-b ${style.border}`}>
              <SortableHeader label="Company" sortKey="company" activeSortKey={sortKey} sortDirection={sortDirection} onSort={setSort} style={style} />
              <SortableHeader label="Job title" sortKey="role" activeSortKey={sortKey} sortDirection={sortDirection} onSort={setSort} style={style} />
              <SortableHeader label="Location" sortKey="location" activeSortKey={sortKey} sortDirection={sortDirection} onSort={setSort} style={style} />
              <SortableHeader label="Work setup" sortKey="workSetup" activeSortKey={sortKey} sortDirection={sortDirection} onSort={setSort} style={style} />
              <SortableHeader label="Salary range" sortKey="salary" activeSortKey={sortKey} sortDirection={sortDirection} onSort={setSort} style={style} />
              <SortableHeader label="Status" sortKey="status" activeSortKey={sortKey} sortDirection={sortDirection} onSort={setSort} style={style} />
              <SortableHeader label="Date applied" sortKey="dateApplied" activeSortKey={sortKey} sortDirection={sortDirection} onSort={setSort} style={style} />
              <th scope="col" aria-label="Actions" className="px-1" />
            </tr>
          </thead>
          <tbody>
            {visibleApplications.map((app) => {
              const displayStatus = getDisplayStatus(app.status);
              return (
                <tr key={app.id} className={`border-b last:border-b-0 transition-colors hover:bg-blue-50/70 dark:hover:bg-blue-500/[0.06] ${style.border}`}>
                  <td className={`min-w-0 px-3 py-4 ${style.primaryText}`}><span className="block truncate" title={app.company}>{app.company}</span></td>
                  <td className="min-w-0 px-3 py-4">
                    <Link to={`/applications/${encodeURIComponent(app.id)}`} title={app.role} className={`block truncate font-medium hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${style.primaryText}`}>
                      {app.role}
                    </Link>
                  </td>
                  <td className={`min-w-0 px-3 py-4 ${style.secondaryText}`}><span className="block truncate" title={app.location || ""}>{app.location || "—"}</span></td>
                  <td className={`min-w-0 px-3 py-4 ${style.secondaryText}`}><span className="block truncate" title={app.workSetup || ""}>{app.workSetup || "—"}</span></td>
                  <td className={`min-w-0 px-3 py-4 ${style.secondaryText}`}><span className="block truncate" title={formatSalary(app)}>{formatSalary(app)}</span></td>
                  <td className="px-3 py-4"><StatusBadge tone={statusTone[displayStatus] || "gray"}>{displayStatus}</StatusBadge></td>
                  <td className={`whitespace-nowrap px-3 py-4 text-xs ${style.secondaryText}`}>{formatDate(app.dateApplied)}</td>
                  <td className="px-1 py-2">
                    <ApplicationActionsMenu
                      application={app}
                      style={style}
                      isOpen={openMenuId === app.id}
                      onToggle={() => setOpenMenuId((current) => current === app.id ? null : app.id)}
                      actionMenuRef={actionMenuRef}
                      onEdit={() => handleEditApplication(app)}
                      onDelete={() => handleDeleteApplication(app)}
                    />
                  </td>
                </tr>
              );
            })}
            {visibleApplications.length === 0 && (
              <tr>
                <td colSpan="8" className={`px-4 py-14 text-center ${style.secondaryText}`}>
                  {applications.length === 0 ? "No applications yet. Add one to get started." : "No applications match your search or filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {isModalOpen && (
        <ApplicationModal
          key={editingApplication?.id || "new"}
          application={editingApplication}
          resumes={resumes}
          style={style}
          onClose={closeApplicationModal}
          onSave={saveApplication}
          onResumeUploaded={uploadResumeForApplication}
        />
      )}
      {deletingApplication && (
        <DeleteApplicationModal
          application={deletingApplication}
          style={style}
          onClose={() => setDeletingApplication(null)}
          onConfirm={async () => {
            try {
              await api.delete(`/applications/${encodeURIComponent(deletingApplication.id)}`);
              setApplications((current) => current.filter((application) => application.id !== deletingApplication.id));
              setDeletingApplication(null);
              toast.success("Application deleted.");
            } catch (error) {
              toast.error(error.response?.data?.message || "Unable to delete application. Please try again.");
            }
          }}
        />
      )}
    </div>
  );
}
