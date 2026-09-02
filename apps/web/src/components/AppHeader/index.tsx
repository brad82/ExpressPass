import {
  AppBar,
  Badge as NotificationBadge,
  Box,
  IconButton,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";
import type { Customer } from "@expresspass/shared";
import { Bell, Menu, Search } from "lucide-react";
import { type MouseEvent, useState } from "react";
import { useLocation } from "react-router-dom";
import { AccountMenu } from "./AccountMenu";
import { Breadcrumb } from "./Breadcrumb";
import { appBarColors } from "./colors";
import { MobileNavigationDrawer } from "./MobileNavigationDrawer";
import { currentNavigationPath, DesktopNavigation } from "./navigation";

type Mode = "light" | "dark";

type Props = {
  mode: Mode;
  unread: number;
  customer: Customer | null;
  authUserName?: string;
  onNotificationsClick: (event: MouseEvent<HTMLElement>) => void;
  onToggleMode: () => void;
  onSignOut: () => void;
};

function DecorativeSearch({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <Box
        aria-hidden
        sx={{
          display: { xs: "none", md: "flex", lg: "none" },
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          color: "rgba(255,255,255,0.75)",
        }}
      >
        <Search size={18} />
      </Box>
    );
  }
  return (
    <Box
      aria-hidden
      sx={{
        display: { xs: "none", lg: "flex" },
        alignItems: "center",
        gap: 1,
        height: 34,
        width: 230,
        px: 1.5,
        borderRadius: "17px",
        bgcolor: "rgba(255,255,255,0.14)",
        color: "rgba(255,255,255,0.75)",
        fontSize: "0.8125rem",
      }}
    >
      <Search size={16} />
      <Typography variant="body2" component="span" noWrap sx={{ color: "inherit" }}>
        Search items or barcodes
      </Typography>
    </Box>
  );
}

export function AppHeader({
  mode,
  unread,
  customer,
  authUserName,
  onNotificationsClick,
  onToggleMode,
  onSignOut,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const currentPath = currentNavigationPath(location.pathname);
  const theme = useTheme();
  const colors = appBarColors(theme.palette.mode);

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar
        sx={{
          minHeight: "56px !important",
          height: 56,
          gap: 2.5,
          px: { xs: 1.5, md: 2.5 },
          bgcolor: colors.tier1Bg,
          color: "#fff",
        }}
      >
        <IconButton
          color="inherit"
          aria-label="open navigation"
          edge="start"
          onClick={() => setDrawerOpen((open) => !open)}
          sx={{ display: { md: "none" }, ml: -1 }}
        >
          <Menu size={22} />
        </IconButton>
        <Typography
          variant="h6"
          component="span"
          noWrap
          sx={{
            fontWeight: 700,
            fontSize: { xs: "1.0625rem", md: "1.125rem" },
            letterSpacing: "-0.01em",
          }}
        >
          Express Pass
        </Typography>
        <DesktopNavigation currentPath={currentPath} colors={colors} />
        <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />
        <DecorativeSearch compact={false} />
        <DecorativeSearch compact />
        <IconButton
          color="inherit"
          aria-label="notifications"
          onClick={onNotificationsClick}
        >
          <NotificationBadge badgeContent={unread} color="error">
            <Bell size={20} />
          </NotificationBadge>
        </IconButton>
        <AccountMenu
          customer={customer}
          authUserName={authUserName}
          mode={mode}
          colors={colors}
          onToggleMode={onToggleMode}
          onSignOut={onSignOut}
        />
      </Toolbar>
      <Toolbar
        variant="dense"
        sx={{
          minHeight: "42px !important",
          height: 42,
          px: { xs: 1.5, md: 2.5 },
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Breadcrumb pathname={location.pathname} />
      </Toolbar>
      <MobileNavigationDrawer
        open={drawerOpen}
        currentPath={currentPath}
        onClose={() => setDrawerOpen(false)}
        customer={customer}
        authUserName={authUserName}
        unread={unread}
        mode={mode}
        colors={colors}
        onNotificationsClick={onNotificationsClick}
        onToggleMode={onToggleMode}
        onSignOut={onSignOut}
      />
    </AppBar>
  );
}
