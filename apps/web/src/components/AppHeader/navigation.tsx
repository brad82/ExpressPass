import { Box, Button } from "@mui/material";
import { LayoutDashboard, Package, User } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import type { AppBarColors } from "./colors";

export const navigationItems = [
  { label: "Dashboard", path: "/", icon: <LayoutDashboard size={17} /> },
  { label: "Profile", path: "/profile", icon: <User size={17} /> },
  { label: "Consignments", path: "/consignments", icon: <Package size={17} /> },
];

export function currentNavigationPath(pathname: string) {
  return navigationItems.find((item) =>
    item.path === "/" ? pathname === "/" : pathname.startsWith(item.path),
  )?.path;
}

export function DesktopNavigation({
  currentPath,
  colors,
}: {
  currentPath?: string;
  colors: AppBarColors;
}) {
  return (
    <Box
      component="nav"
      sx={{ display: { xs: "none", md: "flex" }, gap: 0.5, flexGrow: 1 }}
    >
      {navigationItems.map((item) => {
        const active = currentPath === item.path;
        return (
          <Button
            key={item.path}
            component={RouterLink}
            to={item.path}
            variant="text"
            startIcon={item.icon}
            sx={{
              height: 34,
              px: 1.5,
              borderRadius: "6px",
              textTransform: "none",
              whiteSpace: "nowrap",
              fontWeight: active ? 600 : 500,
              fontSize: "0.875rem",
              color: active ? colors.navActiveText : colors.navText,
              bgcolor: active ? colors.navActiveBg : "transparent",
              "&:hover": {
                bgcolor: active ? colors.navActiveBg : colors.navHoverBg,
              },
            }}
          >
            {item.label}
          </Button>
        );
      })}
    </Box>
  );
}
