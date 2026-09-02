import {
  Avatar,
  Badge as NotificationBadge,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import type { Customer } from "@expresspass/shared";
import { Bell, LogOut, Moon, X } from "lucide-react";
import { type MouseEvent } from "react";
import { Link as RouterLink } from "react-router-dom";
import { accountInitials, accountLabel, accountSubtitle } from "./accountIdentity";
import type { AppBarColors } from "./colors";
import { navigationItems } from "./navigation";

const drawerWidth = 300;

type Mode = "light" | "dark";

type Props = {
  open: boolean;
  currentPath?: string;
  onClose: () => void;
  customer: Customer | null;
  authUserName?: string;
  unread: number;
  mode: Mode;
  colors: AppBarColors;
  onNotificationsClick: (event: MouseEvent<HTMLElement>) => void;
  onToggleMode: () => void;
  onSignOut: () => void;
};

export function MobileNavigationDrawer({
  open,
  currentPath,
  onClose,
  customer,
  authUserName,
  unread,
  mode,
  colors,
  onNotificationsClick,
  onToggleMode,
  onSignOut,
}: Props) {
  const label = accountLabel(customer, authUserName);
  const initials = accountInitials(customer, authUserName);
  const subtitle = accountSubtitle(customer, authUserName);

  return (
    <Box component="nav">
      <Drawer
        variant="temporary"
        anchor="left"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ height: 56, px: 2, bgcolor: colors.tier1Bg, color: "#fff" }}
        >
          <IconButton
            aria-label="close navigation"
            onClick={onClose}
            sx={{ color: "inherit", ml: -1 }}
          >
            <X size={22} />
          </IconButton>
          <Typography
            variant="h6"
            component="span"
            sx={{ fontWeight: 700, fontSize: "1.0625rem", letterSpacing: "-0.01em" }}
          >
            Express Pass
          </Typography>
        </Stack>

        <List sx={{ px: 1, py: 1 }}>
          {navigationItems.map((item) => {
            const active = currentPath === item.path;
            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  selected={active}
                  onClick={onClose}
                  sx={{
                    height: 48,
                    borderRadius: 2,
                    "&.Mui-selected": {
                      bgcolor: "rgba(0,103,168,0.1)",
                      color: "primary.dark",
                      "& .MuiListItemIcon-root": { color: "primary.dark" },
                    },
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText
                    primaryTypographyProps={{
                      fontWeight: active ? 600 : 500,
                    }}
                    primary={item.label}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        <Divider sx={{ mx: 2 }} />
        <List sx={{ px: 1, py: 0.75 }}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={onNotificationsClick}
              sx={{ height: 48, borderRadius: 2 }}
            >
              <ListItemIcon>
                <Bell size={20} />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontWeight: 500 }}>
                Notifications
              </ListItemText>
              {unread > 0 ? (
                <NotificationBadge badgeContent={unread} color="error" />
              ) : null}
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={onToggleMode}
              sx={{ height: 48, borderRadius: 2 }}
            >
              <ListItemIcon>
                <Moon size={20} />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontWeight: 500 }}>
                Dark mode
              </ListItemText>
              <Switch
                edge="end"
                size="small"
                checked={mode === "dark"}
                onChange={onToggleMode}
                onClick={(event) => event.stopPropagation()}
              />
            </ListItemButton>
          </ListItem>
        </List>

        <Box sx={{ flexGrow: 1 }} />

        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ px: 2.5, py: 1.75, borderTop: 1, borderColor: "divider" }}
        >
          <Avatar
            sx={{
              width: 34,
              height: 34,
              fontSize: "0.8125rem",
              fontWeight: 600,
              bgcolor: "primary.main",
              color: "primary.contrastText",
            }}
          >
            {initials}
          </Avatar>
          <Stack sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {label}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {subtitle}
            </Typography>
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            aria-label="sign out"
            onClick={() => {
              onClose();
              onSignOut();
            }}
            disabled={!authUserName}
            sx={{ color: "error.dark" }}
          >
            <LogOut size={20} />
          </IconButton>
        </Stack>
      </Drawer>
    </Box>
  );
}
