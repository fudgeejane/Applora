
import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import {
  Menu,
  X,
  ChevronDown,
  Moon,
  Sun,
} from "lucide-react";

import { useDarkMode } from "../components/ui/useDarkMode";
import { useStyle } from "../components/ui/Style";
import Logo from "../assets/Logo.png";

function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const style = useStyle();

  const closeMenus = () => {
    setMenuOpen(false);
    setHelpOpen(false);
  };

  const navLink =
    "text-sm font-medium transition hover:text-blue-600 dark:hover:text-blue-400";

  return (
    <div className={`min-h-screen ${style.primaryBg} ${style.primaryText}`}>
      {/* HEADER */}
      <header className={`fixed inset-x-0 top-0 z-50 ${style.headerBg}`}>
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">

          {/* LOGO */}
          <Link
            to="/"
            onClick={closeMenus}
            className="flex items-center gap-2"
          >
              <img src={Logo} alt="Applora Logo" className="h-6 w-6" />

            <span className="text-xl font-bold tracking-tight">
              Applora
            </span>
          </Link>

          {/* DESKTOP NAVIGATION */}
          <nav className="hidden items-center gap-8 md:flex">
            <a href="/#home" className={`${navLink} ${style.navText}`}>
              Home
            </a>

            <a href="/#about" className={`${navLink} ${style.navText}`}>
              About
            </a>

            <a href="/#features" className={`${navLink} ${style.navText}`}>
              Features
            </a>

            {/* HELP CENTER DROPDOWN */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setHelpOpen(!helpOpen)}
                className={`flex items-center gap-1 ${navLink} ${style.navText}`}
                aria-expanded={helpOpen}
              >
                Help Center
                <ChevronDown
                  size={16}
                  className={`transition-transform ${helpOpen ? "rotate-180" : ""}`}
                />
              </button>

              {helpOpen && (
                <div
                  className={`absolute right-0 top-10 w-48 overflow-hidden rounded-xl ${style.dropdownBg}`}
                >
                  {[
                    ["Contact", "/contact"],
                    ["Terms of Service", "/terms"],
                    ["Privacy Policy", "/privacy"],
                  ].map(([label, path]) => (
                    <Link
                      key={path}
                      to={path}
                      onClick={closeMenus}
                      className={`block px-4 py-3 text-sm ${style.hoverBg}`}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* DESKTOP ACTIONS */}
          <div className="hidden items-center gap-3 md:flex">
            <div
              className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-[#11141B]"
              role="group"
              aria-label="Color theme"
            >
              <button
                type="button"
                onClick={() => isDarkMode && toggleDarkMode()}
                className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                  !isDarkMode
                    ? "bg-white text-amber-500 shadow-sm dark:bg-gray-700"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
                aria-label="Light mode"
                aria-pressed={!isDarkMode}
              >
                <Sun size={15} />
              </button>
              <button
                type="button"
                onClick={() => !isDarkMode && toggleDarkMode()}
                className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                  isDarkMode
                    ? "bg-white text-sky-500 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
                aria-label="Dark mode"
                aria-pressed={isDarkMode}
              >
                <Moon size={15} />
              </button>
            </div>

            <Link
              to="/signin"
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${style.secondaryButton}`}
            >
              Sign In
            </Link>

            <Link
              to="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Sign Up
            </Link>
          </div>

          {/* MOBILE ACTIONS */}
          <div className="flex items-center gap-2 md:hidden">
            <div
              className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-[#11141B]"
              role="group"
              aria-label="Color theme"
            >
              <button
                type="button"
                onClick={() => isDarkMode && toggleDarkMode()}
                className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                  !isDarkMode
                    ? "bg-white text-amber-500 shadow-sm dark:bg-gray-700"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
                aria-label="Light mode"
                aria-pressed={!isDarkMode}
              >
                <Sun size={15} />
              </button>
              <button
                type="button"
                onClick={() => !isDarkMode && toggleDarkMode()}
                className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                  isDarkMode
                    ? "bg-white text-sky-500 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
                aria-label="Dark mode"
                aria-pressed={isDarkMode}
              >
                <Moon size={15} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className={`rounded-lg p-2.5 ${style.hoverBg}`}
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* MOBILE NAVIGATION */}
        {menuOpen && (
          <div className={`border-t px-5 py-5 md:hidden ${style.border}`}>
            <nav className="flex flex-col gap-1">
              {[
                ["Home", "/#home"],
                ["About", "/#about"],
                ["Features", "/#features"],
              ].map(([label, path]) => (
                <a
                  key={label}
                  href={path}
                  onClick={closeMenus}
                  className={`rounded-lg px-3 py-3 text-sm ${style.hoverBg}`}
                >
                  {label}
                </a>
              ))}

              <div className={`my-2 border-t ${style.border}`} />

              <p className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${style.mutedText}`}>
                Help Center
              </p>

              {[
                ["Contact", "/contact"],
                ["Terms of Service", "/terms"],
                ["Privacy Policy", "/privacy"],
              ].map(([label, path]) => (
                <Link
                  key={path}
                  to={path}
                  onClick={closeMenus}
                  className={`rounded-lg px-3 py-3 text-sm ${style.hoverBg}`}
                >
                  {label}
                </Link>
              ))}

              <div className={`my-2 border-t ${style.border}`} />

              <Link
                to="/signin"
                onClick={closeMenus}
                className={`rounded-lg px-3 py-3 text-sm font-semibold ${style.hoverBg}`}
              >
                Sign In
              </Link>

              <Link
                to="/signup"
                onClick={closeMenus}
                className="rounded-lg bg-blue-600 px-3 py-3 text-center text-sm font-semibold text-white"
              >
                Sign Up
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* PAGE CONTENT */}
      <main>
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className={`border-t ${style.border} ${style.secondaryBg}`}>
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

            <div>
              <Link to="/" className="flex items-center gap-2">
                  <img src={Logo} alt="Applora Logo" className="h-6 w-6" />
                <span className="text-xl font-bold">Applora</span>
              </Link>

              <p className={`mt-4 max-w-xs text-sm leading-7 ${style.secondaryText}`}>
                Your career journey, organized. Manage your
                applications and take control of your future.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">Explore</h3>
              <div className={`mt-4 flex flex-col gap-3 text-sm ${style.secondaryText}`}>
                <a href="/#home" className={style.navText}>Home</a>
                <a href="/#about" className={style.navText}>About</a>
                <a href="/#features" className={style.navText}>Features</a>
              </div>
            </div>

            <div>
              <h3 className="font-semibold">Help Center</h3>
              <div className={`mt-4 flex flex-col gap-3 text-sm ${style.secondaryText}`}>
                <Link to="/contact" className={style.navText}>Contact</Link>
                <Link to="/terms" className={style.navText}>Terms of Service</Link>
                <Link to="/privacy" className={style.navText}>Privacy Policy</Link>
              </div>
            </div>

            <div>
              <h3 className="font-semibold">Get Started</h3>
              <div className={`mt-4 flex flex-col gap-3 text-sm ${style.secondaryText}`}>
                <Link to="/signin" className={style.navText}>Sign In</Link>
                <Link to="/signup" className={style.navText}>Create Account</Link>
              </div>
            </div>
          </div>

          <div className={`mt-12 border-t pt-6 text-center text-sm ${style.border} ${style.mutedText}`}>
            © {new Date().getFullYear()} Applora. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PublicLayout;
