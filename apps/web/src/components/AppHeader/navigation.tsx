import {
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { LayoutDashboard, Package, User } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

const drawerWidth = 280;

const navigationItems = [
  { label: "Dashboard", path: "/", icon: <LayoutDashboard size={18} /> },
  { label: "Profile", path: "/profile", icon: <User size={18} /> },
  { label: "Consignments", path: "/consignments", icon: <Package size={18} /> },
];

export function currentNavigationPath(pathname: string) {
  return navigationItems.find((item) =>
    item.path === "/" ? pathname === "/" : pathname.startsWith(item.path),
  )?.path;
}

export function DesktopNavigation({ currentPath }: { currentPath?: string }) {
  return (
    <Box
      component="nav"
      sx={{ display: { xs: "none", md: "flex" }, gap: 0.5, flexGrow: 1 }}
    >
      {navigationItems.map((item) => (
        <Button
          key={item.path}
          component={RouterLink}
          to={item.path}
          color="inherit"
          startIcon={item.icon}
          variant={currentPath === item.path ? "outlined" : "text"}
          sx={{
            borderColor:
              currentPath === item.path ? "currentColor" : "transparent",
            whiteSpace: "nowrap",
          }}
        >
          {item.label}
        </Button>
      ))}
    </Box>
  );
}

export function MobileNavigationDrawer({
  open,
  currentPath,
  onClose,
  authUserName,
  onSignOut,
}: {
  open: boolean;
  currentPath?: string;
  onClose: () => void;
  authUserName?: string;
  onSignOut: () => void;
}) {
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
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h2">Navigation</Typography>
          </Stack>
        </Box>
        <Divider />
        <List>
          {navigationItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={RouterLink}
                to={item.path}
                selected={currentPath === item.path}
                onClick={onClose}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ px: 2, pb: 2 }}>
          <Button
            fullWidth
            startIcon={<User size={18} />}
            onClick={onSignOut}
            disabled={!authUserName}
          >
            Sign out
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
}
