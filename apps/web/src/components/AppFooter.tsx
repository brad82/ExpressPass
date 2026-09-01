import { Box, Container, Typography } from "@mui/material";

export function AppFooter() {
  return (
    <Box
      component="footer"
      sx={{ borderTop: 1, borderColor: "divider", py: 2, mt: "auto" }}
    >
      <Container maxWidth="xl">
        <Typography color="text.secondary" variant="overline" textAlign="right">
          Made with ❤️ in Canmore
        </Typography>
      </Container>
    </Box>
  );
}
