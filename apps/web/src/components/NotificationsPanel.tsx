import {
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { CheckCircle } from "lucide-react";
import type { NotificationRow } from "../api";

type Props = {
  notifications: NotificationRow[];
  onRead: (id: string) => Promise<void>;
};

export function NotificationsPanel({ notifications, onRead }: Props) {
  return (
    <Stack spacing={2}>
      <Typography variant="h2">Notifications</Typography>
      <List disablePadding>
        {notifications.map((notification) => (
          <ListItem
            key={notification.id}
            divider
            secondaryAction={
              notification.readAt ? (
                <Chip label="Read" size="small" />
              ) : (
                <Button
                  size="small"
                  startIcon={<CheckCircle size={18} />}
                  onClick={() => onRead(notification.id)}
                >
                  Mark Read
                </Button>
              )
            }
          >
            <ListItemText
              primary={notification.title}
              secondary={`${notification.body} · ${new Date(notification.createdAt).toLocaleString()}`}
            />
          </ListItem>
        ))}
        {notifications.length === 0 ? (
          <ListItem>
            <ListItemText primary="No notifications yet" />
          </ListItem>
        ) : null}
      </List>
    </Stack>
  );
}
