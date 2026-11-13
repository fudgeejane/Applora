import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { Check, ChevronsUpDown, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Filter, LayoutGrid, MoreHorizontal, BadgePlus, Search, Table2 } from "lucide-react";
import { useStyle } from "../../components/ui/Style";
import ApplicationModal from "../../components/modal/ApplicationModal";
import DeleteApplicationModal from "../../components/modal/DeleteApplicationModal";
import { StatusBadge } from "./DashboardPage";
import api from "../../lib/api";
import { uploadResume } from "../../lib/resumes";

const statusLabels = ["Applied", "In review", "Interview", "Offer" ];
const statusFilterOptions = [...statusLabels, "Rejected", "Withdrawn"];
const emptyApplications = [];
const tablePageSize = 10;
const statusTone = {
  Applied: "blue",
  Interview: "purple",
  "In review": "orange",
  Offer: "green",
  Rejected: "red",
  Withdrawn: "gray",
  Closed: "gray",
};

function StatusFilter({ value, onChange, style }) {
  const [isOpen, setIsOpen] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!filterRef.current?.contains(event.target)) setIsOpen(false);
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
    <div ref={filterRef} className="relative w-full min-w-0 max-w-sm shrink-0">
      <button
        type="button"
        aria-label="Filter applications by status"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex py-2 min-w-0  items-center gap-2 rounded-md border px-3 text-sm transition ${style.input} ${style.hoverBg} ${style.border}`}
      >
        <Filter size={16} aria-hidden="true" className={`shrink-0 ${style.mutedText}`} />
        <span className="min-w-0 flex-1 truncate text-left">{value || "All statuses"}</span>
        <ChevronDown size={14} aria-hidden="true" className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label="Filter applications by status"
          className={`absolute left-0 top-full z-30 mt-1.5 w-max min-w-44 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border shadow-lg ${style.border} ${style.secondaryBg}`}
        >
          {["", ...statusFilterOptions].map((status) => {
            const selected = value === status;
            return (
              <button
                key={status || "all"}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  onChange(status);
                  setIsOpen(false);
                }}
                className={`flex min-h-10 w-full items-center gap-2 whitespace-nowrap rounded-md p-2 text-left text-sm transition ${
                  selected
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                    : `${style.primaryText} ${style.hoverBg}`
                }`}
              >
                <span className="flex-1">{status || "All statuses"}</span>
                {selected && <Check size={15} aria-hidden="true" />}
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
  if (status === "Rejected") return "Rejected";
  if (status === "Withdrawn") return "Withdrawn";
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

function ApplicationActionsMenu({ application, style, isOpen, onToggle, actionMenuRef, menuPortalRef, onEdit, onDelete }) {
  const triggerRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current?.getBoundingClientRect();
    if (!trigger) return;
    const menuWidth = 192;
    const menuHeight = 96;
    const left = Math.max(8, Math.min(trigger.right - menuWidth, window.innerWidth - menuWidth - 8));
    const top = trigger.bottom + menuHeight <= window.innerHeight - 8
      ? trigger.bottom + 4
      : Math.max(8, trigger.top - menuHeight - 4);
    setMenuPosition({ left, top });
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  return (
    <div className="relative flex shrink-0 justify-center" ref={isOpen ? actionMenuRef : null}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Actions for ${application.role} at ${application.company}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          updatePosition();
          onToggle();
        }}
        className={`flex p-2 items-center justify-center rounded-md ${style.secondaryText} ${style.hoverBg}`}
      >
        <MoreHorizontal size={18} />
      </button>
      {isOpen && menuPosition && createPortal(
        <div
          ref={menuPortalRef}
          role="menu"
          onClick={(event) => event.stopPropagation()}
          style={{ left: menuPosition.left, top: menuPosition.top }}
          className={`fixed z-[60] w-48 rounded-md border  shadow-lg ${style.border} ${style.secondaryBg}`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={onEdit}
            className={`px-5 py-2.5 w-full flex items-start text-sm border-b rounded-t-md ${style.border} ${style.primaryText} ${style.hoverBg}`}
          >
            Edit application
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={onDelete}
            className={`px-5 py-2.5 w-full flex items-start text-sm  rounded-b-md ${style.primaryText} ${style.hoverBg}`}
          >
            Delete application
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}

function SortableHeader({ label, sortKey, activeSortKey, sortDirection, onSort, style }) {
  const active = sortKey === activeSortKey;
  const SortIcon = !active ? ChevronsUpDown : sortDirection === "asc" ? ChevronUp : ChevronDown;
  return (
    <th scope="col" aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"} className="px-3 py-2 text-left">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex py-2.5 items-center gap-1.5 whitespace-nowrap rounded px-1 text-xs font-semibold uppercase tracking-wide ${active ? "text-blue-700 dark:text-blue-300" : style.secondaryText} ${style.hoverBg}`}
      >
        {label}
        <SortIcon size={14} aria-hidden="true" />
      </button>
    </th>
  );
}

function ApplicationsLoadingSkeleton({ style, viewMode }) {
  const placeholder = "animate-pulse rounded bg-slate-200 dark:bg-[#333333]";
  const tableHeaders = ["Company", "Job title", "Location", "Work setup", "Salary range", "Status", "Date applied", ""];

  return (
    <section aria-label="Loading applications" aria-busy="true">
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {statusLabels.map((status) => (
          <div key={status} className={`min-w-0 rounded-lg border p-4 ${style.border} ${style.tableBg}`}>
            <div className={`mb-2 h-3 w-16 ${placeholder}`} />
            <div className={`h-8 w-8 ${placeholder}`} />
          </div>
        ))}
      </div>
      <div className="mb-5 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className={`h-10 w-10 rounded-md ${placeholder}`} />
          <div className={`h-10 w-full rounded-md sm:max-w-xs ${placeholder}`} />
          <div className={`h-10 w-32 shrink-0 rounded-lg ${placeholder}`} />
        </div>
        <div className="flex items-center justify-end gap-2">
          <div className={`h-10 w-[4.5rem] rounded-lg ${placeholder}`} />
          <div className={`h-10 w-32 rounded-lg ${placeholder}`} />
        </div>
      </div>
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <article key={index} className={`min-w-0 rounded-xl border p-4 ${style.border} ${style.tableBg}`}>
              <div className={`mb-3 h-3 w-24 ${placeholder}`} />
              <div className={`h-4 w-2/3 ${placeholder}`} />
              <div className={`mt-5 h-px w-full ${style.border} border-t`} />
              <div className="mt-4 grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }, (_, field) => (
                  <div key={field} className="space-y-2">
                    <div className={`h-2 w-14 ${placeholder}`} />
                    <div className={`h-3 w-20 ${placeholder}`} />
                  </div>
                ))}
              </div>
              <div className={`mt-4 h-6 w-16 rounded-full ${placeholder}`} />
            </article>
          ))}
        </div>
      ) : (
        <div className={`min-w-0 overflow-x-auto rounded-xl border shadow-sm ${style.border} ${style.tableBg}`}>
          <table className="w-full min-w-[68rem] table-fixed border-collapse text-sm">
            <caption className="sr-only">Loading your job applications</caption>
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
            <thead className={style.tableHeader}>
              <tr className={`border-b ${style.border}`}>
                {tableHeaders.map((header) => (
                  <th key={header || "actions"} scope="col" className="px-3 py-3 text-left">
                    {header
                      ? <span className={`inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-wide ${style.secondaryText}`}>{header}</span>
                      : <span className="sr-only">Actions</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }, (_, row) => (
                <tr key={row} className={`border-b last:border-b-0 ${style.border}`}>
                  <td className="px-3 py-3"><div className={`h-3 w-24 ${placeholder}`} /></td>
                  <td className="px-3 py-3"><div className={`h-3 w-32 ${placeholder}`} /></td>
                  <td className="px-3 py-3"><div className={`h-3 w-24 ${placeholder}`} /></td>
                  <td className="px-3 py-3"><div className={`h-3 w-16 ${placeholder}`} /></td>
                  <td className="px-3 py-3"><div className={`h-3 w-28 ${placeholder}`} /></td>
                  <td className="px-3 py-3"><div className={`h-3 w-16 ${placeholder}`} /></td>
                  <td className="px-3 py-3"><div className={`h-3 w-20 ${placeholder}`} /></td>
                  <td className="px-2 py-3"><div className={`h-2 w-4 ${placeholder}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={`flex items-center justify-end gap-2 border-t px-4 py-2 ${style.border}`}>
            <div className={`mr-2 h-3 w-20 ${placeholder}`} />
            <div className={`h-7 w-7 rounded-full ${placeholder}`} />
            <div className={`h-7 w-7 rounded-full ${placeholder}`} />
          </div>
        </div>
      )}
      <span className="sr-only">Loading applications…</span>
    </section>
  );
}

export default function ApplicationsPage() {
  const style = useStyle();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchQuery = "", applications: loadedApplications, setApplications, resumes: loadedResumes, setResumes, workspaceError, loadWorkspace } = useOutletContext();
  const loading = !Array.isArray(loadedApplications);
  const applications = loadedApplications || emptyApplications;
  const resumes = Array.isArray(loadedResumes) ? loadedResumes : [];
  const [viewMode, setViewMode] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches ? "table" : "grid"
  );
  const [tablePage, setTablePage] = useState(1);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState("dateApplied");
  const [sortDirection, setSortDirection] = useState("desc");
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get("add") === "true");
  const [editingApplication, setEditingApplication] = useState(null);
  const [deletingApplication, setDeletingApplication] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const actionMenuRef = useRef(null);
  const menuPortalRef = useRef(null);
  const combinedQuery = `${query} ${searchQuery}`.trim().toLowerCase();
  const visibleApplications = useMemo(
    () => applications
      .filter((app) => {
        if (app.archived) return false;
        if (statusFilter && getDisplayStatus(app.status) !== statusFilter) return false;
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
    [applications, combinedQuery, sortDirection, sortKey, statusFilter],
  );
  const tablePageCount = Math.max(1, Math.ceil(visibleApplications.length / tablePageSize));
  const currentTablePage = Math.min(tablePage, tablePageCount);
  const tableApplications = visibleApplications.slice(
    (currentTablePage - 1) * tablePageSize,
    currentTablePage * tablePageSize,
  );
  const firstTableResult = visibleApplications.length === 0
    ? 0
    : (currentTablePage - 1) * tablePageSize + 1;
  const openApplication = (application) => {
    navigate(`/applications/${encodeURIComponent(application.id)}`);
  };
  const handleApplicationRowClick = (event, application) => {
    if (event.target.closest("a, button")) return;
    openApplication(application);
  };
  const handleApplicationRowKeyDown = (event, application) => {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    openApplication(application);
  };
  const lastTableResult = Math.min(currentTablePage * tablePageSize, visibleApplications.length);

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
    setTablePage(1);
    if (sortKey === key) {
      setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDirection(key === "dateApplied" ? "desc" : "asc");
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
      if (!actionMenuRef.current?.contains(event.target) && !menuPortalRef.current?.contains(event.target)) {
        setOpenMenuId(null);
      }
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

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className={`text-2xl font-semibold tracking-tight sm:text-3xl ${style.primaryText}`}>Applications</h1>
            <p className={`mt-1 text-sm sm:text-base ${style.secondaryText}`}>
              Keep track of your job search, click application to view details, and add new applications using the button below.
            </p>
          </div>
        </header>
        <ApplicationsLoadingSkeleton style={style} viewMode={viewMode} />
      </div>
    );
  }
  if (workspaceError) return <section className={`mx-auto max-w-xl rounded-xl border p-8 text-center ${style.border} ${style.secondaryBg}`} role="alert"><p className={style.primaryText}>Applications could not be loaded.</p><p className={`mt-2 text-sm ${style.secondaryText}`}>{workspaceError}</p><button type="button" onClick={loadWorkspace} className={`mt-4 rounded-md px-4 py-2 text-sm ${style.buttonBlue}`}>Try again</button></section>;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className={`text-2xl font-semibold tracking-tight sm:text-3xl ${style.primaryText}`}>Applications</h1>
          <p className={`mt-1 text-sm sm:text-base ${style.secondaryText}`}>
Track your job applications and click to view details. Add new applications below.          </p>
        </div>
      </header>

      <section aria-label="Application totals by status" className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">

        {statusLabels.map((status) => (
          <article key={status} className={`min-w-0 rounded-lg border p-4 ${style.border} ${style.tableBg}`}>
            <p className={`truncate text-xs font-medium ${style.secondaryText}`}>{status}</p>
            <p className={`mt-2 text-2xl font-semibold tabular-nums ${style.primaryText}`}>{statusCounts[status]}</p>
          </article>
        ))}
      </section>

      <div className="mb-5 flex min-w-0 flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <label className={`flex py-2 min-w-0 w-full rounded-md border px-3.5 sm:max-w-xs ${style.input} ${style.border}`}>
          <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <Search size={16} className={`shrink-0 ${style.mutedText}`} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setTablePage(1);
            }}
            placeholder="Search roles or companies"
            aria-label="Search roles or companies"
            className="w-full min-w-0 bg-transparent text-sm outline-none"
          />
          </span>
        </label>

          <StatusFilter value={statusFilter} onChange={(status) => {
            setStatusFilter(status);
            setTablePage(1);
          }} style={style} />

        </div>


        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">

          <div role="group" aria-label="Application view" className={`flex  shrink-0 items-center rounded-lg border  ${style.border} ${style.secondaryBg}`}>
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
              className={`flex p-2.5 items-center justify-center rounded-md rounded-r-none transition ${viewMode === "grid" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : `${style.secondaryText} ${style.hoverBg}`}`}
            >
              <LayoutGrid size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Table view"
              aria-pressed={viewMode === "table"}
              onClick={() => setViewMode("table")}
              className={`flex p-2.5 rounded-l-none items-center justify-center rounded-md transition ${viewMode === "table" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : `${style.secondaryText} ${style.hoverBg}`}`}
            >
              <Table2 size={16} aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={`inline-flex py-2 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold  ${style.buttonBlue}`}
          >
            <BadgePlus size={16} aria-hidden="true" />
            <span>Add application</span>
          </button>
        </div>
      </div>

      {viewMode === "grid" && <section aria-label="Applications grid" className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleApplications.map((app) => {
          const displayStatus = getDisplayStatus(app.status);
          return (
            <article
              key={app.id}
              tabIndex={0}
              aria-label={`Open application for ${app.role} at ${app.company}`}
              onClick={(event) => handleApplicationRowClick(event, app)}
              onKeyDown={(event) => handleApplicationRowKeyDown(event, app)}
              className={`min-w-0 cursor-pointer rounded-xl border p-4 shadow-sm transition hover:border-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${style.border} ${style.tableBg}`}
            >
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
                  menuPortalRef={menuPortalRef}
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
      </section>}

      {viewMode === "table" && <section aria-label="Applications table" className={`min-w-0 overflow-x-auto rounded-xl border shadow-sm ${style.border} ${style.tableBg}`}>
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
            {tableApplications.map((app) => {
              const displayStatus = getDisplayStatus(app.status);
              return (
                <tr
                  key={app.id}
                  tabIndex={0}
                  aria-label={`Open application for ${app.role} at ${app.company}`}
                  onClick={(event) => handleApplicationRowClick(event, app)}
                  onKeyDown={(event) => handleApplicationRowKeyDown(event, app)}
                  className={`cursor-pointer border-b last:border-b-0 transition-colors hover:bg-blue-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-blue-500/[0.06] ${style.border}`}
                >
                  <td className={`min-w-0 px-3 py-2.5 ${style.primaryText}`}><span className="block truncate" title={app.company}>{app.company}</span></td>
                  <td className="min-w-0 px-3 py-2.5">
                    <Link to={`/applications/${encodeURIComponent(app.id)}`} title={app.role} className={`block truncate font-medium hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${style.primaryText}`}>
                      {app.role}
                    </Link>
                  </td>
                  <td className={`min-w-0 px-3 py-2.5 ${style.secondaryText}`}><span className="block truncate" title={app.location || ""}>{app.location || "—"}</span></td>
                  <td className={`min-w-0 px-3 py-2.5 ${style.secondaryText}`}><span className="block truncate" title={app.workSetup || ""}>{app.workSetup || "—"}</span></td>
                  <td className={`min-w-0 px-3 py-2.5 ${style.secondaryText}`}><span className="block truncate" title={formatSalary(app)}>{formatSalary(app)}</span></td>
                  <td className="px-3 py-2.5"><StatusBadge tone={statusTone[displayStatus] || "gray"}>{displayStatus}</StatusBadge></td>
                  <td className={`whitespace-nowrap px-3 py-2.5 text-xs ${style.secondaryText}`}>{formatDate(app.dateApplied)}</td>
                  <td className="px-1 py-2">
                    <ApplicationActionsMenu
                      application={app}
                      style={style}
                      isOpen={openMenuId === app.id}
                      onToggle={() => setOpenMenuId((current) => current === app.id ? null : app.id)}
                      actionMenuRef={actionMenuRef}
                      menuPortalRef={menuPortalRef}
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
        <nav aria-label="Applications table pagination" className={`flex flex-col gap-3 border-t px-4 py-2 sm:flex-row sm:items-center sm:justify-end ${style.border}`}>
          <p className={`text-xs ${style.secondaryText}`} aria-live="polite">
            Showing {firstTableResult}–{lastTableResult} of {visibleApplications.length}
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setTablePage(currentTablePage - 1)}
              disabled={currentTablePage <= 1}
              style={{ cursor: currentTablePage <= 1 ? "not-allowed" : "pointer" }}
              className={`inline-flex items-center rounded-full border p-1 text-sm transition ${style.input} ${style.hoverBg} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setTablePage(currentTablePage + 1)}
              disabled={currentTablePage >= tablePageCount}
              style={{ cursor: currentTablePage >= tablePageCount ? "not-allowed" : "pointer" }}
              className={`inline-flex items-center rounded-full border p-1 text-sm transition ${style.input} ${style.hoverBg} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </nav>
      </section>}

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
