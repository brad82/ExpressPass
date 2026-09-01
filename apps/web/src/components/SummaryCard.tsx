import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type Props = {
  title: string;
  value: ReactNode;
  detail?: ReactNode;
};

export function SummaryCard({ title, value, detail }: Props) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Typography color="text.secondary" variant="body2">
            {title}
          </Typography>
          <Typography variant="h3">{value}</Typography>
          {detail ? (
            <Box sx={{ color: "text.secondary", typography: "body2" }}>
              {detail}
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
