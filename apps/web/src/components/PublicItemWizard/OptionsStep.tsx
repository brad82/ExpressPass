import {
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import {
  formatCents,
  type ConsignmentItem,
  type ItemType,
} from "@expresspass/shared";

type Props = {
  item: ConsignmentItem;
  description: string;
  selectedType?: ItemType;
  size: string;
  onRedTagChange: (redTag: boolean) => void;
};

export function OptionsStep({
  item,
  description,
  selectedType,
  size,
  onRedTagChange,
}: Props) {
  return (
    <Stack spacing={2} sx={{ pt: 1 }}>
      <FormControlLabel
        control={
          <Checkbox
            checked={item.redTag}
            onChange={(event) => onRedTagChange(event.target.checked)}
          />
        }
        label="Red Tag"
      />
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="h3">{description}</Typography>
            <Typography color="text.secondary">
              {selectedType?.description} · Size {size}
            </Typography>
            <Typography>{formatCents(item.priceCents)}</Typography>
            <Typography color="text.secondary">
              {item.new ? "New item" : "Used item"} ·{" "}
              {item.redTag ? "Red Tag selected" : "No Red Tag"}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
