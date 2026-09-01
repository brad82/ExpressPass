import {
  Alert,
  Card,
  CardContent,
  Grid,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Snackbar,
} from "@mui/material";
import { lazy, Suspense, useState } from "react";
import { Bell, BriefcaseBusiness, User } from "lucide-react";
import {
  Link as RouterLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import type {
  Customer,
} from "@expresspass/shared";
import {
  useUpdateBusinessInformationMutation,
  useUpdateNotificationPreferencesMutation,
  useUpdateProfileMutation,
} from "../api";

const BusinessInformationForm = lazy(() =>
  import("../components/ProfileSettings/BusinessInformationForm").then(
    (module) => ({ default: module.BusinessInformationForm }),
  ),
);
const NotificationPreferences = lazy(() =>
  import("../components/ProfileSettings/NotificationPreferences").then(
    (module) => ({ default: module.NotificationPreferences }),
  ),
);
const ProfileForm = lazy(() =>
  import("../components/ProfileSettings/ProfileForm").then((module) => ({
    default: module.ProfileForm,
  })),
);

type Props = {
  customer: Customer;
};

export default function ProfileSettingsPage({ customer }: Props) {
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updateProfile, updateProfileState] = useUpdateProfileMutation();
  const [updateBusinessInformation, updateBusinessInformationState] =
    useUpdateBusinessInformationMutation();
  const [updateNotificationPreferences, updateNotificationPreferencesState] =
    useUpdateNotificationPreferencesMutation();
  const navItems = [
    { label: "Profile", path: "/profile", icon: <User size={18} /> },
    {
      label: "Notification Preferences",
      path: "/profile/notifications",
      icon: <Bell size={18} />,
    },
    ...(customer.role === "business"
      ? [
          {
            label: "Business Information",
            path: "/profile/business",
            icon: <BriefcaseBusiness size={18} />,
          },
        ]
      : []),
  ];

  async function saveWithFeedback<T>(
    save: (value: T) => Promise<void>,
    value: T,
    message: string,
  ) {
    await save(value);
    setSuccessMessage(message);
  }

  return (
    <>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <List
            component="nav"
            sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1 }}
          >
            {navItems.map((item) => (
              <ListItemButton
                key={item.path}
                component={RouterLink}
                to={item.path}
                selected={location.pathname === item.path}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Grid>
        <Grid size={{ xs: 12, md: 9 }}>
          <Card variant="outlined">
            <CardContent>
              <Suspense fallback={null}>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <ProfileForm
                        customer={customer}
                        saving={updateProfileState.isLoading}
                        onSave={(profile) =>
                          saveWithFeedback(
                            async (value) => {
                              await updateProfile(value).unwrap();
                            },
                            profile,
                            "Profile saved",
                          )
                        }
                      />
                    }
                  />
                  <Route
                    path="notifications"
                    element={
                      <NotificationPreferences
                        customer={customer}
                        saving={updateNotificationPreferencesState.isLoading}
                        onSave={(preferences) =>
                          saveWithFeedback(
                            async (value) => {
                              await updateNotificationPreferences(
                                value,
                              ).unwrap();
                            },
                            preferences,
                            "Notification preferences saved",
                          )
                        }
                      />
                    }
                  />
                  <Route
                    path="business"
                    element={
                      customer.role === "business" ? (
                        <BusinessInformationForm
                          customer={customer}
                          saving={updateBusinessInformationState.isLoading}
                          onSave={(information) =>
                            saveWithFeedback(
                              async (value) => {
                                await updateBusinessInformation(value).unwrap();
                              },
                              information,
                              "Business information saved",
                            )
                          }
                        />
                      ) : (
                        <Navigate to="/profile" replace />
                      )
                    }
                  />
                  <Route
                    path="*"
                    element={<Navigate to="/profile" replace />}
                  />
                </Routes>
              </Suspense>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
