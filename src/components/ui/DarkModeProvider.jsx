
import { useEffect, useState } from "react";
import { DarkModeContext } from "./darkModeContext";

function getInitialThemeMode() {
  const savedThemeMode = localStorage.getItem("applora-theme-mode");
  if (savedThemeMode === "light" || savedThemeMode === "dark" || savedThemeMode === "system") {
    return savedThemeMode;
  }
  return localStorage.getItem("applora-theme") === "dark" ? "dark" : "light";
}

export function DarkModeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(getInitialThemeMode);
  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const isDarkMode = themeMode === "system" ? systemPrefersDark : themeMode === "dark";

  useEffect(() => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = (event) => setSystemPrefersDark(event.matches);
    systemTheme.addEventListener("change", updateSystemTheme);
    return () => systemTheme.removeEventListener("change", updateSystemTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("applora-theme-mode", themeMode);
    localStorage.setItem("applora-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode, themeMode]);

  const toggleDarkMode = () => {
    setThemeMode(isDarkMode ? "light" : "dark");
  };

  return (
    <DarkModeContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        themeMode,
        setThemeMode,
      }}
    >
      {children}
    </DarkModeContext.Provider>
  );
}
