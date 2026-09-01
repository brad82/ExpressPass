import { lazy, Suspense, type MouseEvent, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  CssBaseline,
  LinearProgress,
  ThemeProvider,
} from "@mui/material";
import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";
import { PortalRoutes } from "./PortalRoutes";
import { useAuthSession } from "../auth/useAuthSession";
import { usePortalData } from "../hooks/usePortalData";
import { useThemeMode } from "../hooks/useThemeMode";
import type { PortalPageProps } from "../types";

const NotificationsPopover = lazy(() =>
  import("./NotificationsPopover").then((module) => ({
    default: module.NotificationsPopover,
  })),
);

export function PortalShell() {
  const { mode, theme, toggleMode } = useThemeMode();
  const [notificationAnchor, setNotificationAnchor] =
    useState<HTMLElement | null>(null);
  const auth = useAuthSession();
  const shouldLoadPortal = auth.isReady && Boolean(auth.userName);
  const portalData = usePortalData(shouldLoadPortal);

  const pageProps: PortalPageProps | null = portalData.customer
    ? {
        customer: portalData.customer,
        consignments: portalData.consignments,
        itemTypes: portalData.itemTypes,
        equipmentManufacturers: portalData.equipmentManufacturers,
        notifications: portalData.notifications,
        unread: portalData.unread,
        latestConsignment: portalData.latestConsignment,
      }
    : null;

  function openNotifications(event: MouseEvent<HTMLElement>) {
    setNotificationAnchor(event.currentTarget);
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <AppHeader
          mode={mode}
          unread={portalData.unread}
          authUserName={auth.userName}
          onNotificationsClick={openNotifications}
          onToggleMode={toggleMode}
          onSignOut={auth.signOut}
        />
        {notificationAnchor ? (
          <Suspense fallback={null}>
            <NotificationsPopover
              anchorEl={notificationAnchor}
              notifications={portalData.notifications}
              onClose={() => setNotificationAnchor(null)}
            />
          </Suspense>
        ) : null}
        <Container component="main" maxWidth="xl" sx={{ py: 3, flexGrow: 1 }}>
          {auth.error || portalData.error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {auth.error ?? portalData.error}
            </Alert>
          ) : null}
          {!auth.isReady || !auth.userName || portalData.isLoading ? (
            <LinearProgress />
          ) : pageProps ? (
            <PortalRoutes pageProps={pageProps} />
          ) : (
            <Button onClick={auth.loadPortal}>Load Portal</Button>
          )}
        </Container>
        <AppFooter />
      </Box>
    </ThemeProvider>
  );
}
