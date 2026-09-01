import { Button, Grid, Stack, TextField, Typography } from "@mui/material";
import { Save } from "lucide-react";
import { useState } from "react";
import type { BusinessInformation, Customer } from "@expresspass/shared";

type Props = {
  customer: Customer;
  saving: boolean;
  onSave: (information: BusinessInformation) => Promise<void>;
};

export function BusinessInformationForm({ customer, saving, onSave }: Props) {
  const [businessName, setBusinessName] = useState(
    customer.profile.businessName ?? "",
  );
  const [vendorCodes, setVendorCodes] = useState(
    (customer.profile.vendorCodes ?? []).join(", "),
  );
  const [gstNumber, setGstNumber] = useState(customer.profile.gstNumber ?? "");
  const vendorCodeTokens = vendorCodes
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token !== "");
  const validVendorCodes = vendorCodeTokens.every((token) =>
    /^\d{3}$/.test(token),
  );

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h2">Business Information</Typography>
        <Typography color="text.secondary">
          Business identifiers used to match consignments with the Gearshift.
        </Typography>
      </Stack>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            required
            label="Business Name"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Vendor Codes"
            value={vendorCodes}
            error={!validVendorCodes}
            helperText="Optional — one or more 3-digit codes assigned by the sale, separated by commas (e.g. 203, 204)"
            onChange={(event) => setVendorCodes(event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="GST Registration #"
            value={gstNumber}
            onChange={(event) => setGstNumber(event.target.value)}
          />
        </Grid>
      </Grid>
      <Button
        startIcon={<Save size={18} />}
        disabled={saving || !businessName.trim() || !validVendorCodes}
        onClick={() =>
          void onSave({
            businessName,
            gstNumber: gstNumber.trim() || undefined,
            vendorCodes: vendorCodeTokens.length
              ? vendorCodeTokens.map(Number)
              : undefined,
          })
        }
      >
        Save Business Information
      </Button>
    </Stack>
  );
}
