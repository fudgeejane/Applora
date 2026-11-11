import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Check, ChevronDown, Filter, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useStyle } from "../../components/ui/Style";
import ApplicationModal from "../../components/modal/ApplicationModal";
import DeleteApplicationModal from "../../components/modal/DeleteApplicationModal";
import { StatusBadge } from "../../components/dashboard/DashboardUI";
import { getUpcomingInterviewApplicationIds } from "../../utils/dashboardStats";

const statuses = ["Applied", "Screening", "Interview", "Offer", "Rejected", "Withdrawn"];
const statusTone = {
  Applied: "blue",
  Interview: "purple",
  Screening: "orange",
  "Under Review": "orange",
  Offer: "green",
  Rejected: "red",
  Accepted: "green",
  Withdrawn: "gray",
};
const statusDot = {
  Applied: "bg-blue-500",
  Interview: "bg-purple-500",
  Screening: "bg-orange-500",
  "Under Review": "bg-orange-500",
  Offer: "bg-green-500",
  Rejected: "bg-red-500",
  Accepted: "bg-emerald-500",
  Withdrawn: "bg-slate-500",
};

function StatusFilterDropdown({ value, onChange, style }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const options = ["All statuses", ...statuses, "Active applications", "Responded applications", "Scheduled interviews"];

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
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Filter by status: ${value}`}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex w-full items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition ${style.input} ${style.hoverBg}`}
      >
        <Filter size={15} className={style.mutedText} />
        <span className="whitespace-nowrap">{value}</span>
        <ChevronDown size={14} className={`ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div
          role="listbox"
          aria-label="Filter applications by status"
          className={`absolute left-0 top-full z-30 mt-1.5 w-full min-w-48 overflow-hidden rounded-lg border p-1 shadow-lg ${style.border} ${style.secondaryBg}`}
        >
          {options.map((option) => {
            const selected = value === option;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition ${
                  selected
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                    : `${style.primaryText} ${style.hoverBg}`
                }`}
              >
                {option === "All statuses" ? (
                  <Filter size={14} className={selected ? "text-blue-600 dark:text-blue-300" : style.mutedText} />
                ) : (
                  <span className={`h-2 w-2 rounded-full ${statusDot[option]}`} />
                )}
                <span className="flex-1">{option}</span>
                {selected && <Check size={15} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatSalary(application) {
  const { salaryMin, salaryMax, salaryCurrency } = application;
  if (!salaryMin && !salaryMax) return "—";

  const formatAmount = (value) => Number(value).toLocaleString();
  const range = salaryMin && salaryMax
    ? `${formatAmount(salaryMin)}–${formatAmount(salaryMax)}`
    : formatAmount(salaryMin || salaryMax);
  return `${salaryCurrency || "PHP"} ${range}`;
}

export default function ApplicationsPage() {
  const style = useStyle();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchQuery = "", applications, setApplications } = useOutletContext();
  const [query, setQuery] = useState("");
  const requestedStatus = searchParams.get("status");
  const initialFilter = ({
    active: "Active applications",
    responded: "Responded applications",
    interviews: "Scheduled interviews",
    "Under Review": "Screening",
  })[requestedStatus] || requestedStatus || "All statuses";
  const [filter, setFilter] = useState(initialFilter);
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get("add") === "true");
  const [editingApplication, setEditingApplication] = useState(null);
  const [deletingApplication, setDeletingApplication] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const actionMenuRef = useRef(null);
  const combinedQuery = `${query} ${searchQuery}`.trim().toLowerCase();
  const interviewApplicationIds = useMemo(
    () => getUpcomingInterviewApplicationIds(applications),
    [applications],
  );
  const visibleApplications = useMemo(
    () => applications.filter((app) => {
      if (app.archived) return false;
      const searchable = [
        app.role, app.company, app.location, app.workSetup, app.status,
        app.source, app.salaryCurrency, app.salaryMin, app.salaryMax, app.notes,
        app.contactName, app.contactEmail,
      ].join(" ").toLowerCase();
      const status = app.status === "Under Review" ? "Screening" : app.status === "Accepted" ? "Offer" : app.status;
      const active = ["Applied", "Screening", "Under Review"].includes(app.status);
      const responded = app.status !== "Applied";
      const scheduledInterview = interviewApplicationIds.has(app.id);
      const matchesFilter = filter === "All statuses"
        || status === filter
        || (filter === "Active applications" && active)
        || (filter === "Responded applications" && responded)
        || (filter === "Scheduled interviews" && scheduledInterview);
      return searchable.includes(combinedQuery) && matchesFilter;
    }),
    [applications, combinedQuery, filter, interviewApplicationIds],
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
    () => Object.fromEntries(
      statuses.map((status) => [
        status,
        applications.filter((application) => !application.archived && (application.status === "Under Review" ? "Screening" : application.status === "Accepted" ? "Offer" : application.status) === status).length,
      ]),
    ),
    [applications],
  );

  const saveApplication = (application) => {
    const now = new Date().toISOString();
    const newActivity = (type, message) => ({
      id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      message,
      createdAt: now,
    });
    setApplications((current) => {
      const previous = current.find((item) => item.id === application.id);
      if (!previous) {
        return [{ ...application, activity: [newActivity("edit", "Application created")] }, ...current];
      }
      const events = [];
      if (previous.status !== application.status) {
        events.push(newActivity("status", `Status changed from ${previous.status} to ${application.status}`));
      }
      if ((previous.notes || "") !== (application.notes || "")) {
        events.push(newActivity("notes", application.notes
          ? previous.notes ? "Application notes updated" : "Application notes added"
          : "Application notes removed"));
      }
      const hasDetailsEdit = Object.keys(application).some((key) => (
        !["status", "notes", "activity"].includes(key)
        && JSON.stringify(previous[key]) !== JSON.stringify(application[key])
      ));
      if (hasDetailsEdit) events.push(newActivity("edit", "Application details updated"));
      return current.map((item) => item.id === application.id
        ? { ...application, activity: [...(previous.activity || []), ...events] }
        : item);
    });
    closeApplicationModal();
    toast.success("Application saved.");
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

  return (
    <div className="mx-auto w-full max-w-7xl">

      <div >
          <h1 className={`mb-1 text-2xl sm:text-3xl font-semibold ${style.primaryText}`}>Applications</h1>
          <p className={`text-sm sm:text-base ${style.secondaryText}`}>Track your job applications and their statuses.</p>
      </div>

      <section aria-label="Application counts by status" className="my-8 grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
        {statuses.map((status) => {
          const selected = filter === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(selected ? "All statuses" : status)}
              className={`min-w-0 rounded border py-4 px-6  text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                selected
                  ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10"
                  : `${style.border} ${style.secondaryBg} hover:border-blue-300 dark:hover:border-blue-700`
              }`}
            >
              <span className={`block text-2xl font-semibold tabular-nums ${selected ? "text-blue-700 dark:text-blue-300" : style.primaryText}`}>
                {statusCounts[status]}
              </span>
              <span className={`mt-1 block truncate text-xs font-medium uppercase tracking-wide ${selected ? "text-blue-700 dark:text-blue-300" : style.secondaryText}`}>
                {status}
              </span>
            </button>
          );
        })}
      </section>

      <div style={style} className="min-w-0">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
            <label className={`flex min-w-0 flex-1 items-center gap-2 rounded-md border px-3 lg:max-w-sm ${style.input}`}>
              <Search size={16} className={`shrink-0 ${style.mutedText}`} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search applications..."
                aria-label="Search applications"
                className="w-full min-w-0 bg-transparent py-2.5 text-sm outline-none"
              />
            </label>

            <StatusFilterDropdown value={filter} onChange={setFilter} style={style} />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium ${style.buttonBlue}`}
            >
              <Plus size={16} /> Add application
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[18%]" />
                <col className="w-[14%]" />
                <col className="w-[11%]" />
                <col className="w-[13%]" />
                <col className="w-[14%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead className={`${style.secondaryText} text-xs`}>
                <tr className={`border-b uppercase ${style.border}`}>
                  {["Position & company", "Location / work setup", "Salary", "Source", "Status", "Date applied", "Actions"].map((heading) => (
                    <th key={heading} className="px-2.5 py-3 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleApplications.map((app) => (
                  <tr
                    key={app.id}
                    role="link"
                    tabIndex={0}
                    aria-label={`View ${app.role} at ${app.company}`}
                    onClick={() => navigate(`/applications/${encodeURIComponent(app.id)}`)}
                    onKeyDown={(event) => {
                      if ((event.key === "Enter" || event.key === " ") && !event.target.closest("button")) {
                        event.preventDefault();
                        navigate(`/applications/${encodeURIComponent(app.id)}`);
                      }
                    }}
                    className={`cursor-pointer border-b last:border-0 hover:bg-black/[0.03] focus:outline-none focus-visible:bg-black/[0.04] dark:hover:bg-white/[0.03] dark:focus-visible:bg-white/[0.04] ${style.border}`}
                  >
                    <td className="px-2.5 py-3">
                      <span className={`block truncate font-medium ${style.primaryText}`}>
                        {app.role}
                      </span>
                      <span className={`mt-0.5 block truncate text-xs ${style.secondaryText}`}>
                        {app.company}
                      </span>
                    </td>
                    <td className={`px-2.5 py-3 ${style.secondaryText}`}>
                      <span className="block truncate">{app.location || "—"}</span>
                      <span className={`mt-0.5 block truncate text-xs ${style.mutedText}`}>{app.workSetup || "—"}</span>
                    </td>
                    <td className={`px-2.5 py-3 text-xs ${style.secondaryText}`}><span className="block truncate">{formatSalary(app)}</span></td>
                    <td className={`px-2.5 py-3 ${style.secondaryText}`}><span className="block truncate">{app.source || "—"}</span></td>
                    <td className="px-2.5 py-3"><StatusBadge tone={statusTone[app.status] || "gray"}>{app.status}</StatusBadge></td>
                    <td className={`px-2.5 py-3 text-xs ${style.secondaryText}`}>{formatDate(app.dateApplied)}</td>
                    <td className="px-2.5 py-3">
                      <div className="relative flex justify-center" ref={openMenuId === app.id ? actionMenuRef : null}>
                        <button
                          type="button"
                          aria-label={`Actions for ${app.role} at ${app.company}`}
                          aria-haspopup="menu"
                          aria-expanded={openMenuId === app.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuId((current) => current === app.id ? null : app.id);
                          }}
                          className={`rounded-md p-1.5 ${style.secondaryText} ${style.hoverBg}`}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {openMenuId === app.id && (
                          <div role="menu" onClick={(event) => event.stopPropagation()} className={`absolute right-0 top-full z-20 mt-1 w-48 rounded-md border p-1 shadow-lg ${style.border} ${style.secondaryBg}`}>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenMenuId(null);
                                setEditingApplication(app);
                                setIsModalOpen(true);
                              }}
                              className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm ${style.primaryText} ${style.hoverBg}`}
                            >
                              <Pencil size={14} /> Edit application
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenMenuId(null);
                                setDeletingApplication(app);
                              }}
                              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 dark:text-red-400"
                            >
                              <Trash2 size={14} /> Delete application
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleApplications.length === 0 && (
                  <tr>
                    <td colSpan="7" className={`px-3 py-10 text-center ${style.secondaryText}`}>
                      {applications.length === 0 ? "No applications yet. Add one to get started." : "No applications match your filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      </div>

      {isModalOpen && (
        <ApplicationModal
          key={editingApplication?.id || "new"}
          application={editingApplication}
          style={style}
          onClose={closeApplicationModal}
          onSave={saveApplication}
        />
      )}
      {deletingApplication && (
        <DeleteApplicationModal
          application={deletingApplication}
          style={style}
          onClose={() => setDeletingApplication(null)}
          onConfirm={() => {
            setApplications((current) => current.filter((application) => application.id !== deletingApplication.id));
            setDeletingApplication(null);
            toast.success("Application deleted.");
          }}
        />
      )}
    </div>
  );
}
