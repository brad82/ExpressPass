import { lazy, Suspense } from "react";
import { Card, CardContent, LinearProgress, Stack } from "@mui/material";
import { Bell } from "lucide-react";
import type { Consignment, Customer } from "@expresspass/shared";
import { type NotificationRow, useMarkNotificationReadMutation } from "../api";
import { SummaryCard } from "../components/SummaryCard";
import { friendlyConsignmentStatus } from "../consignmentStatus";

const NotificationsPanel = lazy(() =>
  import("../components/NotificationsPanel").then((module) => ({
    default: module.NotificationsPanel,
  })),
);

type Props = {
  customer: Customer;
  latestConsignment?: Consignment;
  unread: number;
  notifications: NotificationRow[];
};

export default function DashboardPage({
  customer,
  latestConsignment,
  unread,
  notifications,
}: Props) {
  const [markNotificationRead] = useMarkNotificationReadMutation();

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <SummaryCard
          title="Account Link"
          value={customer.gearshiftGuid ? "Linked" : "Pending"}
          detail={
            customer.gearshiftGuid ??
            "Gearshift has not linked this account yet"
          }
        />
        <SummaryCard
          title="Latest Consignment"
          value={
            latestConsignment
              ? friendlyConsignmentStatus[latestConsignment.status]
              : "None"
          }
          detail={latestConsignment?.id ?? "Create a draft to begin"}
        />
        <SummaryCard
          title="Unread Notifications"
          value={unread}
          detail={
            <Stack direction="row" spacing={1} alignItems="center">
              <Bell size={18} />
              Customer-visible alerts
            </Stack>
          }
        />
      </Stack>
      <Card variant="outlined">
        <CardContent>
          <Suspense fallback={<LinearProgress />}>
            <NotificationsPanel
              notifications={notifications.slice(0, 5)}
              onRead={async (id) => {
                await markNotificationRead(id).unwrap();
              }}
            />
          </Suspense>
        </CardContent>
      </Card>
    </Stack>
  );
}
