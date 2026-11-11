import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
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
import SearchBar from "../components/pages/SearchBar";
import initialApplications from "../utils/initialApplications";

import Logo from "../assets/Logo.png";

function PrivateLayout() {
  const style = useStyle();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [applications, setApplications] = useState(initialApplications);

  const navigationItems = [
    { name: "Dashboard", path: "/home", icon: LayoutDashboard },
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

  const sidebarWidth = isCollapsed ? "md:w-[4.5rem]" : "md:w-64";
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
    <div className={`min-h-screen ${style.primaryBg} ${style.primaryText}`}>
      <header
        className={`fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b px-5 md:hidden ${style.secondaryBg} ${style.border}`}
      >
        <Link to="/home" className="flex items-center gap-2">
          <img src={Logo} alt="Applora" className="h-7 w-auto" />
          <span className="font-semibold">Applora</span>
        </Link>
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label={isMobileOpen ? "Close sidebar" : "Open sidebar"}
          className={`rounded-lg p-2 ${style.hoverBg}`}
        >
          {isMobileOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r transition-all duration-300 ease-in-out md:inset-y-0 md:left-0 ${sidebarWidth} ${style.secondaryBg} ${style.border} ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div
          className={`flex h-[4.5rem] shrink-0 items-center justify-between border-b px-4 ${style.border} ${
            isCollapsed
              ? "md:h-auto md:flex-col md:justify-start md:gap-2 md:px-2 md:py-3"
              : ""
          }`}
        >
          {!isCollapsed && (
            <Link
              to="/home"
              onClick={() => setIsMobileOpen(false)}
              className={`flex h-9 min-w-0 shrink-0 items-center gap-2.5 ${
                isCollapsed ? "md:w-9 md:justify-center" : "md:flex-1"
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
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl transition md:inline-flex ${
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

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          isCollapsed={isCollapsed}
          isMobileOpen={isMobileOpen}
          onExpand={() => setIsCollapsed(false)}
          secondaryText={style.secondaryText}
          hoverBg={style.hoverBg}
        />

        <nav
          aria-label="Private navigation"
          className="flex-1 space-y-5 overflow-y-auto px-3.5 py-3"
        >
          {navigationGroups.map((group) => (
            <section key={group.name} aria-label={group.name}>
              {(!isCollapsed || isMobileOpen) && (
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
                      title={isCollapsed ? item.name : ""}
                      className={({ isActive }) => `
                        group flex items-center gap-3 rounded-lg px-3 py-2.5
                        text-sm font-medium transition-all duration-200
                        ${isCollapsed ? "md:justify-center" : ""}
                        ${
                          isActive
                            ? "bg-blue-400/20 text-gray-950 dark:bg-blue-500/10 dark:text-white"
                            : `${style.secondaryText} ${style.hoverBg}`
                        }
                      `}
                    >
                      <Icon size={20} className="shrink-0" />
                      <AnimatePresence initial={false}>
                        {(!isCollapsed || isMobileOpen) && (
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
              isCollapsed ? "md:flex-col" : ""
            }`}
          >
            {isCollapsed && (
              <button
                type="button"
                onClick={toggleDarkMode}
                aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
                title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
                className={`hidden h-10 w-10 items-center justify-center rounded-2xl transition md:flex ${
                  isDarkMode
                    ? "bg-[#252525] text-sky-400 hover:bg-[#333]"
                    : "bg-gray-200/70 text-amber-500 hover:bg-gray-300"
                }`}
              >
                {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            )}

            {(!isCollapsed || isMobileOpen) && (
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
              title={isCollapsed ? "Log out" : ""}
              className={`rounded-lg p-2 transition disabled:opacity-50 ${style.hoverBg}`}
            >
              <LogOut size={18} />
            </button>
          </div>

          <div
            className={`flex items-center gap-2 border-t pt-3 ${style.border} ${
              isCollapsed ? "md:flex-col md:gap-1" : ""
            }`}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200"
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className={`min-w-0 flex-1 ${isCollapsed ? "md:hidden" : ""}`}>
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
        className={`min-h-screen min-w-0 pt-20 transition-[margin] duration-300 ease-in-out md:pt-0 ${
          isCollapsed ? "md:ml-[4.5rem]" : "md:ml-64"
        }`}
      >
        <div className="p-6 sm:p-8">
          <Outlet context={{ searchQuery, applications, setApplications }} />
        </div>
      </motion.main>
    </div>
  );
}

export default PrivateLayout;
