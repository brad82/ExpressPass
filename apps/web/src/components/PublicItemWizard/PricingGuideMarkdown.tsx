import { Box, Typography } from "@mui/material";

type Props = {
  markdown: string;
};

export function PricingGuideMarkdown({ markdown }: Props) {
  return markdown.split("\n").map((line, index) => {
    if (line.startsWith("# ")) {
      return (
        <Typography key={index} variant="h3" sx={{ mt: index === 0 ? 0 : 2 }}>
          {line.slice(2)}
        </Typography>
      );
    }
    if (line.startsWith("- ")) {
      return (
        <Typography key={index} component="li" sx={{ ml: 2 }}>
          {line.slice(2)}
        </Typography>
      );
    }
    if (!line.trim()) {
      return <Box key={index} sx={{ height: 8 }} />;
    }
    return (
      <Typography key={index} variant="body2">
        {line}
      </Typography>
    );
  });
}
