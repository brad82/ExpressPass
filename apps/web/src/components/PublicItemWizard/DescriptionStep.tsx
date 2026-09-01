import {
  Autocomplete,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { DescriptionFields } from "./description";

type Props = {
  fields: DescriptionFields;
  isNew: boolean;
  description: string;
  equipmentManufacturers: string[];
  onFieldsChange: (fields: DescriptionFields) => void;
  onNewChange: (isNew: boolean) => void;
};

export function DescriptionStep({
  fields,
  isNew,
  description,
  equipmentManufacturers,
  onFieldsChange,
  onNewChange,
}: Props) {
  const update = (patch: Partial<DescriptionFields>) =>
    onFieldsChange({ ...fields, ...patch });

  return (
    <Stack spacing={2} sx={{ pt: 1 }}>
      <Typography color="text.secondary">
        A clear description helps shoppers understand what they are looking at.
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Autocomplete
            freeSolo
            options={equipmentManufacturers}
            value={fields.brand || null}
            inputValue={fields.brand}
            onInputChange={(_event, value) => update({ brand: value })}
            onChange={(_event, value) => update({ brand: value ?? "" })}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                required
                label="Brand"
                helperText="Required"
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            required
            label="Model"
            helperText="Required"
            value={fields.model}
            onChange={(event) => update({ model: event.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            required
            label="Size"
            helperText="Required"
            value={fields.size}
            onChange={(event) => update({ size: event.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Condition"
            value={fields.condition}
            onChange={(event) => update({ condition: event.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Other details"
            value={fields.details}
            onChange={(event) => update({ details: event.target.value })}
          />
        </Grid>
      </Grid>
      <FormControlLabel
        control={
          <Checkbox
            checked={isNew}
            onChange={(event) => onNewChange(event.target.checked)}
          />
        }
        label="This item is new"
      />
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Preview
          </Typography>
          <Typography>
            {description || "Description preview will appear here"}
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
