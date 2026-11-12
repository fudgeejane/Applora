import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Sun,
  Moon,
  LogOut,
  Layers,
  BriefcaseBusiness,
  CalendarHeart,
  Bot,
  Settings,
  CircleHelp,
} from "lucide-react";

import { useStyle } from "../components/ui/Style";
import { useDarkMode } from "../components/ui/useDarkMode";
import { useAuth } from "../contexts/useAuth";
import api from "../lib/api";

import Logo from "../assets/Logo.png";

function PrivateLayout() {
  const style = useStyle();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    window.matchMedia("(min-width: 1024px)").matches
  );
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [applications, setApplications] = useState(null);
  const [resumes, setResumes] = useState(null);
  const [workspaceError, setWorkspaceError] = useState("");

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const handleBreakpointChange = (event) => {
      setIsDesktop(event.matches);
      if (event.matches) setIsMobileOpen(false);
    };

    desktopQuery.addEventListener("change", handleBreakpointChange);
    return () => desktopQuery.removeEventListener("change", handleBreakpointChange);
  }, []);

  useEffect(() => {
    if (!isMobileOpen) return;

    const closeDrawerOnEscape = (event) => {
      if (event.key === "Escape") setIsMobileOpen(false);
    };

    window.addEventListener("keydown", closeDrawerOnEscape);
    return () => window.removeEventListener("keydown", closeDrawerOnEscape);
  }, [isMobileOpen]);

  const loadWorkspace = useCallback(async () => {
    setWorkspaceError("");
    setApplications(null);
    setResumes(null);
    try {
      const [applicationResponse, resumeResponse] = await Promise.all([api.get("/applications"), api.get("/resumes")]);
      setApplications(applicationResponse.data.applications);
      setResumes(resumeResponse.data.resumes);
    } catch (error) {
      console.error("Unable to load workspace data:", error?.code || error?.response?.status);
      const message = error.response?.data?.message || "Unable to load your workspace. Please try again.";
      setWorkspaceError(message);
      setApplications([]);
      setResumes([]);
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadWorkspace(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkspace]);

  const navigationItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Applications", path: "/applications", icon: BriefcaseBusiness },
    { name: "Resume", path: "/resume", icon: Layers },
    { name: "Interviews", path: "/interviews", icon: CalendarHeart },
    { name: "AI Assistant", path: "/ai-assistant", icon: Bot },
  ];
  const supportItems = [
    { name: "Settings", path: "/settings", icon: Settings },
    { name: "Help Center", path: "/help-center", icon: CircleHelp },
  ];
  const navigationGroups = [
    { name: "Workspace", items: navigationItems },
    { name: "Other", items: supportItems },
  ];

  const handleLogout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Unable to sign out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const isSidebarCollapsed = isDesktop ? isCollapsed : !isMobileOpen;
  const sidebarWidth = isCollapsed ? "lg:w-16" : "lg:w-60";
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const displayName = fullName || user?.email || "Your account";
  const initials = fullName
    ? fullName
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.[0] || "A").toUpperCase();

  return (
    <div className={`min-h-screen min-w-0 overflow-x-clip ${style.primaryBg} ${style.primaryText}`}>
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        id="private-sidebar"
        aria-label="Private navigation"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r transition-all duration-300 ease-in-out lg:inset-y-0 lg:left-0 ${isMobileOpen ? "w-72" : "w-16"} ${sidebarWidth} ${style.secondaryBg} ${style.border}`}
      >
        <div
          className={`flex h-[4.5rem] shrink-0 items-center justify-between border-b ${isSidebarCollapsed ? "px-2" : "px-4"} ${style.border} ${
            isSidebarCollapsed
              ? "lg:h-auto lg:flex-col lg:justify-start lg:gap-2 lg:px-2 lg:py-3"
              : ""
          }`}
        >
          {(!isSidebarCollapsed || isMobileOpen) && (
            <Link
              to="/dashboard"
              onClick={() => setIsMobileOpen(false)}
              className={`flex h-9 min-w-0 shrink-0 items-center gap-2.5 ${
                isSidebarCollapsed ? "lg:w-9 lg:justify-center" : "lg:flex-1"
              }`}
            >
              <img
                src={Logo}
                alt="Applora"
                className="block h-8 w-8 min-h-8 min-w-8 shrink-0 rounded-lg object-contain"
              />
              <span className="whitespace-nowrap text-base font-bold tracking-tight">
                Applora
              </span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setIsMobileOpen((open) => !open)}
            aria-label={isMobileOpen ? "Close sidebar" : "Expand sidebar"}
            aria-controls="private-sidebar"
            aria-expanded={isMobileOpen}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition lg:hidden ${style.secondaryText} ${style.hoverBg}`}
          >
            {isMobileOpen ? <X size={19} /> : <PanelLeftOpen size={19} />}
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl transition lg:inline-flex ${
              isCollapsed
                ? "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-[#252525] dark:text-gray-100 dark:hover:bg-[#333]"
                : `${style.secondaryText} ${style.hoverBg}`
            }`}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={19} />
            ) : (
              <PanelLeftClose size={19} />
            )}
          </button>
        </div>


        <nav
          aria-label="Private navigation"
          className="flex-1 space-y-8 overflow-y-auto px-3.5 py-8"
        >
          {navigationGroups.map((group) => (
            <section key={group.name} aria-label={group.name}>
              {(!isSidebarCollapsed || isMobileOpen) && (
                <h2 className={`mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider ${style.mutedText}`}>
                  {group.name}
                </h2>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end
                      onClick={() => setIsMobileOpen(false)}
                      title={isSidebarCollapsed ? item.name : ""}
                      className={({ isActive }) => `
                        group flex items-center gap-3 rounded-lg px-2 py-2.5 lg:px-3
                        text-sm font-medium transition-all duration-200
                        ${isSidebarCollapsed ? "justify-center lg:justify-center" : ""}
                        ${
                          isActive
                            ? "bg-blue-400/20 text-gray-950 dark:bg-blue-500/10 dark:text-white"
                            : `${style.secondaryText} ${style.hoverBg}`
                        }
                      `}
                    >
                      <Icon size={18} className="shrink-0" />
                      <AnimatePresence initial={false}>
                        {(!isSidebarCollapsed || isMobileOpen) && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden whitespace-nowrap"
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </NavLink>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className={`shrink-0 border-t p-3 ${style.border}`}>
          <div
            className={`mb-3 flex items-center justify-between gap-2 ${
              isSidebarCollapsed ? "flex-col" : ""
            }`}
          >
            {isSidebarCollapsed && (
              <button
                type="button"
                onClick={toggleDarkMode}
                aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
                title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
                className={`flex h-10 w-10 items-center justify-center rounded-2xl transition ${
                  isDarkMode
                    ? "bg-[#252525] text-sky-400 hover:bg-[#333]"
                    : "bg-gray-200/70 text-amber-500 hover:bg-gray-300"
                }`}
              >
                {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            )}

            {(!isSidebarCollapsed || isMobileOpen) && (
              <div
                className={`flex items-center justify-center gap-2 rounded-full px-3 py-1 ${
                  isDarkMode ? "bg-[#252525]" : "bg-gray-200/70"
                }`}
                aria-label="Color theme"
              >
                <button
                  type="button"
                  onClick={() => isDarkMode && toggleDarkMode()}
                  aria-label="Use light theme"
                  aria-pressed={!isDarkMode}
                  className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                    !isDarkMode
                      ? "bg-white text-amber-500 shadow-sm dark:bg-gray-700"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  <Sun size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => !isDarkMode && toggleDarkMode()}
                  aria-label="Use dark theme"
                  aria-pressed={isDarkMode}
                  className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                    isDarkMode
                      ? "bg-white text-sky-500 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  <Moon size={17} />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label={loggingOut ? "Logging out" : "Log out"}
              title={isSidebarCollapsed ? "Log out" : ""}
              className={`rounded-lg p-2 transition disabled:opacity-50 ${style.hoverBg}`}
            >
              <LogOut size={18} />
            </button>
          </div>

          <div
            className={`flex items-center gap-2 border-t pt-3 ${style.border} ${
            isSidebarCollapsed ? "flex-col gap-1" : ""
            }`}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200"
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className={`min-w-0 flex-1 ${isSidebarCollapsed ? "hidden" : ""}`}>
              <p className="truncate text-xs font-semibold">{displayName}</p>
              {fullName && user?.email && (
                <p className={`truncate text-[11px] ${style.mutedText}`}>
                  {user.email}
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`ml-16 min-h-screen min-w-0 transition-[margin] duration-300 ease-in-out ${
          isCollapsed ? "lg:ml-16" : "lg:ml-60"
        }`}
      >
        <div className="min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet context={{ searchQuery, applications, setApplications, resumes, setResumes, workspaceError, loadWorkspace }} />
        </div>
      </motion.main>
    </div>
  );
}

export default PrivateLayout;
