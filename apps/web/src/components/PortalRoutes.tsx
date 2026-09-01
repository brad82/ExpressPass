import { lazy, Suspense } from "react";
import { LinearProgress, Stack } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import type { PortalPageProps } from "../types";

const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const ProfileSettingsPage = lazy(() => import("../pages/ProfileSettingsPage"));
const ConsignmentsPage = lazy(() => import("../pages/ConsignmentsPage"));

type Props = {
  pageProps: PortalPageProps;
};

export function PortalRoutes({ pageProps }: Props) {
  return (
    <Stack spacing={3}>
      <Suspense fallback={<LinearProgress />}>
        <Routes>
          <Route path="/" element={<DashboardPage {...pageProps} />} />
          <Route
            path="/profile/*"
            element={<ProfileSettingsPage {...pageProps} />}
          />
          <Route
            path="/consignments"
            element={<ConsignmentsPage {...pageProps} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Stack>
  );
}
