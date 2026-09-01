import { Button, Grid, Stack, TextField, Typography } from "@mui/material";
import { Save } from "lucide-react";
import { useState } from "react";
import type { Customer, IdentityProfile } from "@expresspass/shared";

const defaultProfile: IdentityProfile = {
  firstName: "",
  lastName: "",
  email: "customer@example.com",
  address: { line1: "", line2: "", city: "", province: "AB", postalCode: "" },
  businessName: "",
  gstNumber: "",
  phone: "",
};

type Props = {
  customer: Customer;
  saving: boolean;
  onSave: (profile: IdentityProfile) => Promise<void>;
};

export function ProfileForm({ customer, saving, onSave }: Props) {
  const [profile, setProfile] = useState<IdentityProfile>(
    customer.profile ?? defaultProfile,
  );

  const update = (key: keyof IdentityProfile, value: string) =>
    setProfile((current) => ({ ...current, [key]: value }));
  const updateAddress = (
    key: keyof IdentityProfile["address"],
    value: string,
  ) =>
    setProfile((current) => ({
      ...current,
      address: { ...current.address, [key]: value },
    }));

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h2">Profile</Typography>
        <Typography color="text.secondary">
          {customer.role === "business"
            ? "Business consignor profile"
            : "Public consignor profile"}
        </Typography>
      </Stack>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="First name"
            value={profile.firstName}
            onChange={(event) => update("firstName", event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Last name"
            value={profile.lastName}
            onChange={(event) => update("lastName", event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Email"
            value={profile.email}
            onChange={(event) => update("email", event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Address line 1"
            value={profile.address.line1}
            onChange={(event) => updateAddress("line1", event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Address line 2"
            value={profile.address.line2 ?? ""}
            onChange={(event) => updateAddress("line2", event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <TextField
            fullWidth
            label="City"
            value={profile.address.city}
            onChange={(event) => updateAddress("city", event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            fullWidth
            label="Province"
            value={profile.address.province}
            onChange={(event) => updateAddress("province", event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4 }}>
          <TextField
            fullWidth
            label="Postal code"
            value={profile.address.postalCode}
            onChange={(event) =>
              updateAddress("postalCode", event.target.value)
            }
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Phone"
            value={profile.phone ?? ""}
            onChange={(event) => update("phone", event.target.value)}
          />
        </Grid>
      </Grid>
      <Button
        startIcon={<Save size={18} />}
        disabled={saving}
        onClick={() => void onSave(profile)}
      >
        Save Profile
      </Button>
    </Stack>
  );
}
