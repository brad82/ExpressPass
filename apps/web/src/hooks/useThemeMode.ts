import { useMemo, useState } from "react";
import { useMediaQuery } from "@mui/material";
import { makeTheme } from "../theme";

export type ThemeMode = "light" | "dark";

function initialMode(prefersDark: boolean): ThemeMode {
  const stored = localStorage.getItem("themeMode");
  return stored === "light" || stored === "dark"
    ? stored
    : prefersDark
      ? "dark"
      : "light";
}

export function useThemeMode() {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setMode] = useState<ThemeMode>(() => initialMode(prefersDark));
  const theme = useMemo(() => makeTheme(mode), [mode]);

  function toggleMode() {
    const next = mode === "dark" ? "light" : "dark";
    localStorage.setItem("themeMode", next);
    setMode(next);
  }

  return { mode, theme, toggleMode };
}
