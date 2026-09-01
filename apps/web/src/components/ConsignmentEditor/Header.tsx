import { Button, Stack, Typography } from "@mui/material";
import { Send } from "lucide-react";
import type { Consignment } from "@expresspass/shared";
import {
  friendlyConsignmentStatus,
  shortConsignmentId,
} from "../../consignmentStatus";

type Props = {
  consignment: Consignment;
  editable?: boolean;
  hasValidationErrors?: boolean;
  onSaveItems?: () => void;
  onSubmit?: () => void;
};

export function ConsignmentEditorHeader({
  consignment,
  editable = false,
  hasValidationErrors = false,
  onSaveItems,
  onSubmit,
}: Props) {
  const actionDisabled = !editable || hasValidationErrors;

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      justifyContent="space-between"
      spacing={2}
    >
      <Stack>
        <Typography variant="h2">
          Consignment #{shortConsignmentId(consignment.id)}
        </Typography>
        <Typography color="text.secondary">
          Status: {friendlyConsignmentStatus[consignment.status]}
        </Typography>
      </Stack>
      {editable ? (
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            disabled={actionDisabled}
            onClick={onSaveItems}
          >
            Save Items
          </Button>
          <Button
            disabled={actionDisabled}
            startIcon={<Send size={18} />}
            onClick={onSubmit}
          >
            Submit
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}
