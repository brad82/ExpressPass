import type { PaletteMode } from "@mui/material";

export function appBarColors(mode: PaletteMode) {
  const isDark = mode === "dark";
  return {
    tier1Bg: isDark ? "#0e3550" : "#0067a8",
    navText: isDark ? "rgba(232,238,244,0.7)" : "rgba(255,255,255,0.82)",
    navActiveBg: isDark ? "rgba(139,211,255,0.16)" : "rgba(255,255,255,0.18)",
    navActiveText: isDark ? "#8bd3ff" : "#ffffff",
    navHoverBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.1)",
    avatarBg: isDark ? "#8bd3ff" : "#ffffff",
    avatarText: isDark ? "#0b2231" : "#0067a8",
  };
}

export type AppBarColors = ReturnType<typeof appBarColors>;
