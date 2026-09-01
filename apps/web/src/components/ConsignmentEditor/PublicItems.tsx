import {
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { Trash2 } from "lucide-react";
import {
  formatCents,
  type ConsignmentItem,
  type ItemType,
} from "@expresspass/shared";

type Props = {
  editable: boolean;
  items: ConsignmentItem[];
  itemTypes: ItemType[];
  onRemoveItem: (index: number) => void;
};

export function PublicConsignmentItems({
  editable,
  items,
  itemTypes,
  onRemoveItem,
}: Props) {
  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        {items.map((item, index) => (
          <Grid size={{ xs: 12, md: 6 }} key={item.id ?? index}>
            <PublicConsignmentItemCard
              editable={editable}
              item={item}
              itemType={itemTypes.find((type) => type.id === item.itemType)}
              onRemove={() => onRemoveItem(index)}
            />
          </Grid>
        ))}
      </Grid>
      {items.length === 0 ? <EmptyPublicItemsCard /> : null}
    </Stack>
  );
}

type PublicConsignmentItemCardProps = {
  editable: boolean;
  item: ConsignmentItem;
  itemType?: ItemType;
  onRemove: () => void;
};

function PublicConsignmentItemCard({
  editable,
  item,
  itemType,
  onRemove,
}: PublicConsignmentItemCardProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h3">{item.description}</Typography>
          <Typography color="text.secondary">
            {itemType?.description ?? "Item"} · Size {item.itemSize} · Qty{" "}
            {item.qty}
          </Typography>
          <Typography>{formatCents(item.priceCents)}</Typography>
          <Typography color="text.secondary">
            {item.new ? "New" : "Used"} ·{" "}
            {item.redTag ? "Red Tag" : "No Red Tag"}
          </Typography>
          <Typography color="text.secondary">
            Barcode: {item.barcode || "Pending Gearshift barcode"}
          </Typography>
          <Button
            color="error"
            variant="outlined"
            disabled={!editable}
            startIcon={<Trash2 size={18} />}
            onClick={onRemove}
          >
            Remove
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function EmptyPublicItemsCard() {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography color="text.secondary">
          No items yet. Add your first item to start building this consignment.
        </Typography>
      </CardContent>
    </Card>
  );
}
