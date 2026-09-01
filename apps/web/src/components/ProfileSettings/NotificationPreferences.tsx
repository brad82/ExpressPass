import {
  Alert,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { MailCheck, MessageSquareText } from "lucide-react";
import { useState } from "react";
import type {
  Customer,
  NotificationPreferences as Preferences,
} from "@expresspass/shared";

type Props = {
  customer: Customer;
  saving: boolean;
  onSave: (preferences: Preferences) => Promise<void>;
};

export function NotificationPreferences({ customer, saving, onSave }: Props) {
  const [preferences, setPreferences] = useState<Preferences>(
    customer.notificationPreferences,
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h2">Notification Preferences</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={preferences.emailOptIn}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                emailOptIn: event.target.checked,
              }))
            }
          />
        }
        label="Email notifications"
      />
      <FormControlLabel
        control={
          <Switch
            checked={preferences.smsOptIn}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                smsOptIn: event.target.checked,
              }))
            }
          />
        }
        label="SMS notifications"
      />
      <TextField
        label="SMS phone"
        value={preferences.smsPhone ?? ""}
        onChange={(event) =>
          setPreferences((current) => ({
            ...current,
            smsPhone: event.target.value,
          }))
        }
      />
      <FormControlLabel
        control={
          <Switch
            checked={preferences.smsVerified}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                smsVerified: event.target.checked,
              }))
            }
          />
        }
        label="Phone verified"
      />
      {preferences.smsOptIn && !preferences.smsVerified ? (
        <Alert severity="warning">
          SMS delivery requires a verified phone number.
        </Alert>
      ) : null}
      <Button
        startIcon={
          preferences.smsOptIn ? (
            <MessageSquareText size={18} />
          ) : (
            <MailCheck size={18} />
          )
        }
        disabled={saving}
        onClick={() => void onSave(preferences)}
      >
        Save Preferences
      </Button>
    </Stack>
  );
}
