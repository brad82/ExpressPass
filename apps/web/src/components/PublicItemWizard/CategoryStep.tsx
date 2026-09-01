import {
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Typography,
} from "@mui/material";
import type { ItemType } from "@expresspass/shared";

type Props = {
  itemTypes: ItemType[];
  selectedItemType: number;
  onSelect: (itemType: number) => void;
};

export function CategoryStep({ itemTypes, selectedItemType, onSelect }: Props) {
  return (
    <Grid container spacing={2} sx={{ pt: 1 }}>
      {itemTypes.map((itemType) => (
        <Grid key={itemType.id} size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            variant={
              selectedItemType === itemType.id ? "elevation" : "outlined"
            }
          >
            <CardActionArea onClick={() => onSelect(itemType.id)}>
              <CardContent>
                <Typography variant="h3">{itemType.description}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {itemType.shortName}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
