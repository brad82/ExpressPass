import { Box, IconButton, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

type Crumb = { label: string; path?: string };

const routeCrumbs: Record<string, Crumb[]> = {
  "/": [{ label: "Dashboard" }],
  "/consignments": [{ label: "Consignments" }],
  "/profile": [{ label: "Profile" }],
  "/profile/notifications": [
    { label: "Profile", path: "/profile" },
    { label: "Notification Preferences" },
  ],
  "/profile/business": [
    { label: "Profile", path: "/profile" },
    { label: "Business Information" },
  ],
};

export function breadcrumbsForPath(pathname: string): Crumb[] {
  return routeCrumbs[pathname] ?? routeCrumbs["/"];
}

export function Breadcrumb({ pathname }: { pathname: string }) {
  const crumbs = breadcrumbsForPath(pathname);
  const current = crumbs[crumbs.length - 1];
  const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2] : undefined;

  return (
    <>
      <Box
        sx={{
          display: { xs: "flex", sm: "none" },
          alignItems: "center",
          gap: 0.5,
          minWidth: 0,
        }}
      >
        {parent?.path ? (
          <IconButton
            component={RouterLink}
            to={parent.path}
            size="small"
            aria-label={`Back to ${parent.label}`}
            sx={{ color: "primary.main", ml: -1 }}
          >
            <ChevronLeft size={18} />
          </IconButton>
        ) : null}
        <Typography variant="body2" fontWeight={600} noWrap>
          {current.label}
        </Typography>
      </Box>
      <Box
        sx={{
          display: { xs: "none", sm: "flex" },
          alignItems: "center",
          gap: 1,
          minWidth: 0,
        }}
      >
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Box
              key={crumb.label}
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              {index > 0 ? (
                <ChevronRight size={14} style={{ opacity: 0.45 }} />
              ) : null}
              {crumb.path && !isLast ? (
                <Typography
                  component={RouterLink}
                  to={crumb.path}
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    textDecoration: "none",
                    "&:hover": { color: "text.primary" },
                  }}
                >
                  {crumb.label}
                </Typography>
              ) : (
                <Typography
                  variant="body2"
                  fontWeight={isLast ? 600 : 400}
                  color={isLast ? "text.primary" : "text.secondary"}
                >
                  {crumb.label}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </>
  );
}
