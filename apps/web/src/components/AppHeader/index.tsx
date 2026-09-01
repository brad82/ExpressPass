import {
  AppBar,
  Badge as NotificationBadge,
  Button,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { Bell, Menu, Moon, Sun, User } from "lucide-react";
import { type MouseEvent, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  currentNavigationPath,
  DesktopNavigation,
  MobileNavigationDrawer,
} from "./navigation";

type Mode = "light" | "dark";

type Props = {
  mode: Mode;
  unread: number;
  authUserName?: string;
  onNotificationsClick: (event: MouseEvent<HTMLElement>) => void;
  onToggleMode: () => void;
  onSignOut: () => void;
};

export function AppHeader({
  mode,
  unread,
  authUserName,
  onNotificationsClick,
  onToggleMode,
  onSignOut,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const currentPath = currentNavigationPath(location.pathname);

  return (
    <AppBar component="nav" position="sticky">
      <Toolbar sx={{ gap: 2, alignItems: "center", py: 1 }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={() => setDrawerOpen((open) => !open)}
          sx={{ display: { md: "none" } }}
        >
          <Menu size={22} />
        </IconButton>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ minWidth: 0 }}
        >
          <Typography variant="h1" noWrap>
            Express Pass
          </Typography>
        </Stack>
        <DesktopNavigation currentPath={currentPath} />
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ display: { xs: "none", md: "flex" } }}
        >
          <Button
            startIcon={<User size={18} />}
            onClick={onSignOut}
            disabled={!authUserName}
          >
            Sign out
          </Button>
          <IconButton aria-label="notifications" onClick={onNotificationsClick}>
            <NotificationBadge badgeContent={unread} color="error">
              <Bell size={22} />
            </NotificationBadge>
          </IconButton>
          <IconButton aria-label="toggle dark mode" onClick={onToggleMode}>
            {mode === "dark" ? <Sun size={22} /> : <Moon size={22} />}
          </IconButton>
        </Stack>
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{ display: { xs: "flex", md: "none" } }}
        >
          <IconButton aria-label="notifications" onClick={onNotificationsClick}>
            <NotificationBadge badgeContent={unread} color="error">
              <Bell size={22} />
            </NotificationBadge>
          </IconButton>
          <IconButton aria-label="toggle dark mode" onClick={onToggleMode}>
            {mode === "dark" ? <Sun size={22} /> : <Moon size={22} />}
          </IconButton>
        </Stack>
      </Toolbar>
      <MobileNavigationDrawer
        open={drawerOpen}
        currentPath={currentPath}
        onClose={() => setDrawerOpen(false)}
        authUserName={authUserName}
        onSignOut={onSignOut}
      />
    </AppBar>
  );
}
