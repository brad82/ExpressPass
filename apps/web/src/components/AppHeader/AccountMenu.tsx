import {
  Avatar,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import type { Customer } from "@expresspass/shared";
import { ChevronDown, LogOut, Moon, User } from "lucide-react";
import { type MouseEvent, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { accountInitials, accountLabel, accountSubtitle } from "./accountIdentity";
import type { AppBarColors } from "./colors";

type Mode = "light" | "dark";

type Props = {
  customer: Customer | null;
  authUserName?: string;
  mode: Mode;
  colors: AppBarColors;
  onToggleMode: () => void;
  onSignOut: () => void;
};

export function AccountMenu({
  customer,
  authUserName,
  mode,
  colors,
  onToggleMode,
  onSignOut,
}: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const label = accountLabel(customer, authUserName);
  const initials = accountInitials(customer, authUserName);
  const subtitle = accountSubtitle(customer, authUserName);

  function close() {
    setAnchorEl(null);
  }

  return (
    <>
      <IconButton
        aria-label="account menu"
        onClick={(event: MouseEvent<HTMLElement>) =>
          setAnchorEl(event.currentTarget)
        }
        sx={{ pl: 0.5, pr: 1, gap: 0.75, borderRadius: "17px" }}
      >
        <Avatar
          sx={{
            width: 30,
            height: 30,
            fontSize: "0.75rem",
            fontWeight: 600,
            bgcolor: colors.avatarBg,
            color: colors.avatarText,
          }}
        >
          {initials}
        </Avatar>
        <ChevronDown size={16} color="inherit" style={{ opacity: 0.85 }} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 288 } } }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2, py: 1.5 }}>
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
        </Stack>
        <Divider />
        <MenuItem component={RouterLink} to="/profile" onClick={close}>
          <ListItemIcon>
            <User size={17} />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={onToggleMode}>
          <ListItemIcon>
            <Moon size={17} />
          </ListItemIcon>
          <ListItemText>Dark mode</ListItemText>
          <Switch
            edge="end"
            size="small"
            checked={mode === "dark"}
            onChange={onToggleMode}
            onClick={(event) => event.stopPropagation()}
          />
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            onSignOut();
          }}
          disabled={!authUserName}
          sx={{ color: "error.dark" }}
        >
          <ListItemIcon>
            <LogOut size={17} color="inherit" />
          </ListItemIcon>
          <ListItemText>Sign out</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
