import {
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  centsToDollarInput,
  dollarInputToCents,
  formatCents,
} from "@expresspass/shared";
import { PricingGuideMarkdown } from "./PricingGuideMarkdown";

type Props = {
  priceCents: number;
  pricingGuide: string;
  pricingGuideLoading?: boolean;
  onPriceChange: (priceCents: number) => void;
};

export function PriceStep({
  priceCents,
  pricingGuide,
  pricingGuideLoading = false,
  onPriceChange,
}: Props) {
  return (
    <Grid container spacing={3} sx={{ pt: 1 }}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            type="number"
            label="Price"
            inputProps={{ min: 0, step: "0.01" }}
            value={centsToDollarInput(priceCents)}
            onChange={(event) =>
              onPriceChange(dollarInputToCents(event.target.value))
            }
          />
          <Typography color="text.secondary">
            This will be saved as {formatCents(priceCents)}.
          </Typography>
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              {pricingGuideLoading ? (
                <Typography color="text.secondary">
                  Loading pricing guide...
                </Typography>
              ) : (
                <PricingGuideMarkdown markdown={pricingGuide} />
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
