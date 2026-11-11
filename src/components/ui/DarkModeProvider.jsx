
import {
  useEffect,
  useState,
} from "react";
import { DarkModeContext } from "./darkModeContext";

export function DarkModeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("applora-theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      isDarkMode
    );

    localStorage.setItem(
      "applora-theme",
      isDarkMode ? "dark" : "light"
    );
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((previous) => !previous);
  };

  return (
    <DarkModeContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
      }}
    >
      {children}
    </DarkModeContext.Provider>
  );
}
