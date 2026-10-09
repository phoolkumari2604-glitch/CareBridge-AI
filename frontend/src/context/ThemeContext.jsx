import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
  compactMode: false,
  setCompactMode: () => {},
  toggleCompactMode: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved && (saved === "light" || saved === "dark" || saved === "system")) {
      return saved;
    }
    return "light";
  });

  const [compactMode, setCompactModeState] = useState(() => {
    const saved = localStorage.getItem("carebridge_compact");
    return saved === "true";
  });

  const applyTheme = (targetTheme) => {
    const root = document.documentElement;
    let effectiveTheme = targetTheme;
    
    if (targetTheme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      effectiveTheme = prefersDark ? "dark" : "light";
    }

    root.setAttribute("data-theme", effectiveTheme);
    if (effectiveTheme === "dark") {
      root.classList.add("dark-theme");
      root.classList.remove("light-theme");
      document.body.classList.add("dark-theme");
      document.body.classList.remove("light-theme");
    } else {
      root.classList.add("light-theme");
      root.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
      document.body.classList.remove("dark-theme");
    }
  };

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("system");
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (compactMode) {
      root.setAttribute("data-density", "compact");
      document.body.classList.add("density-compact");
    } else {
      root.removeAttribute("data-density");
      document.body.classList.remove("density-compact");
    }
    localStorage.setItem("carebridge_compact", String(compactMode));
  }, [compactMode]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setCompactMode = (val) => {
    setCompactModeState(Boolean(val));
  };

  const toggleCompactMode = () => {
    setCompactModeState((prev) => !prev);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        compactMode,
        setCompactMode,
        toggleCompactMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export default ThemeContext;
