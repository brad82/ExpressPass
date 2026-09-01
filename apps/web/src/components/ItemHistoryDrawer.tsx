import {
  Box,
  Drawer,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import {
  CircleDollarSign,
  History,
  MessageSquareText,
  PackageCheck,
  PackageX,
  Tag,
  X,
  type LucideIcon,
} from "lucide-react";
import { skipToken } from "@reduxjs/toolkit/query/react";
import {
  formatCents,
  type GearshiftItemEvent,
  type GearshiftItemSnapshot,
} from "@expresspass/shared";
import { useGetItemHistoryQuery } from "../api";

type Props = {
  consignmentId: string;
  item: GearshiftItemSnapshot | null;
  onClose: () => void;
};

type TimelineEntry = {
  icon: LucideIcon;
  primary: string;
  secondary?: string;
};

function describeEvent(event: GearshiftItemEvent): TimelineEntry {
  const { detail } = event;
  switch (event.eventType) {
    case "checked_in":
      return {
        icon: PackageCheck,
        primary:
          detail.quantity && detail.quantity > 1
            ? `Checked in (×${detail.quantity})`
            : "Checked in",
      };
    case "checked_out":
      return {
        icon: PackageX,
        primary:
          detail.quantity && detail.quantity > 1
            ? `Reclaimed (×${detail.quantity})`
            : "Reclaimed",
      };
    case "sold":
      return {
        icon: CircleDollarSign,
        primary: `Sold for ${formatCents(detail.amountCents ?? 0)}`,
        secondary:
          detail.quantity && detail.quantity > 1
            ? `${detail.quantity} units`
            : undefined,
      };
    case "price_updated":
      return {
        icon: Tag,
        primary: "Price updated",
        secondary: `${formatCents(detail.previousPriceCents ?? 0)} → ${formatCents(
          detail.priceCents ?? 0,
        )}`,
      };
    case "note_added":
      return {
        icon: MessageSquareText,
        primary: "Note added",
        secondary: detail.note,
      };
  }
}

function Timeline({ events }: { events: GearshiftItemEvent[] }) {
  if (events.length === 0) {
    return (
      <Typography color="text.secondary">
        No history recorded for this item yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={0}>
      {events.map((event, index) => {
        const entry = describeEvent(event);
        const Icon = entry.icon;
        const last = index === events.length - 1;
        return (
          <Stack key={event.id} direction="row" spacing={1.5}>
            <Stack alignItems="center" sx={{ width: 24 }}>
              <Box
                sx={{
                  display: "flex",
                  color: "primary.main",
                  mt: 0.25,
                }}
              >
                <Icon size={18} />
              </Box>
              {last ? null : (
                <Box
                  sx={{
                    flexGrow: 1,
                    width: "2px",
                    bgcolor: "divider",
                    my: 0.5,
                  }}
                />
              )}
            </Stack>
            <Box sx={{ pb: last ? 0 : 2 }}>
              <Typography variant="body2" fontWeight={600}>
                {entry.primary}
              </Typography>
              {entry.secondary ? (
                <Typography variant="body2" color="text.secondary">
                  {entry.secondary}
                </Typography>
              ) : null}
              <Typography variant="caption" color="text.secondary">
                {new Date(event.occurredAt).toLocaleString()}
              </Typography>
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

export function ItemHistoryDrawer({ consignmentId, item, onClose }: Props) {
  const { data, isLoading, isError } = useGetItemHistoryQuery(
    item ? { consignmentId, gearshiftItemId: item.id } : skipToken,
  );

  return (
    <Drawer
      anchor="right"
      open={item !== null}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 380 } } } }}
    >
      <Stack spacing={2} sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <History size={20} />
          <Typography variant="h3" sx={{ flexGrow: 1 }}>
            Item History
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close history">
            <X size={18} />
          </IconButton>
        </Stack>
        {item ? (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {item.description ?? "Item"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {[item.barcode, item.itemSize].filter(Boolean).join(" · ")}
            </Typography>
          </Box>
        ) : null}
        {isLoading ? <LinearProgress /> : null}
        {isError ? (
          <Typography color="error">Could not load item history.</Typography>
        ) : null}
        {data ? <Timeline events={data} /> : null}
      </Stack>
    </Drawer>
  );
}
