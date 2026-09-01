import { Box, Popover } from "@mui/material";
import type { NotificationRow } from "../api";
import { useMarkNotificationReadMutation } from "../api";
import { NotificationsPanel } from "./NotificationsPanel";

type Props = {
  anchorEl: HTMLElement | null;
  notifications: NotificationRow[];
  onClose: () => void;
};

export function NotificationsPopover({
  anchorEl,
  notifications,
  onClose,
}: Props) {
  const [markNotificationRead] = useMarkNotificationReadMutation();

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <Box
        sx={{
          width: { xs: 320, sm: 440 },
          maxHeight: 560,
          overflow: "auto",
          p: 2,
        }}
      >
        <NotificationsPanel
          notifications={notifications}
          onRead={async (id) => {
            await markNotificationRead(id).unwrap();
          }}
        />
      </Box>
    </Popover>
  );
}
