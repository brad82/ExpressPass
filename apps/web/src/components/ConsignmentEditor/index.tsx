import {
  Button,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { Plus } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  type Consignment,
  type ConsignmentItem,
  type Customer,
  type ItemType,
} from "@expresspass/shared";
import { emptyItem } from "../../types";
import { ConsignmentEditorHeader } from "./Header";
import { PublicConsignmentItems } from "./PublicItems";
import { businessBarcodeError } from "./validation";

const BusinessConsignmentGrid = lazy(() =>
  import("./BusinessGrid").then((module) => ({
    default: module.BusinessConsignmentGrid,
  })),
);
const PublicItemWizard = lazy(() =>
  import("../PublicItemWizard").then((module) => ({
    default: module.PublicItemWizard,
  })),
);

type Props = {
  customer: Customer;
  consignment: Consignment;
  itemTypes: ItemType[];
  equipmentManufacturers: string[];
  autoStartWizard?: boolean;
  onSaveItems: (id: string, items: ConsignmentItem[]) => Promise<void>;
  onSubmit: (id: string) => Promise<void>;
};

export function ConsignmentEditor({
  customer,
  consignment,
  itemTypes,
  equipmentManufacturers,
  autoStartWizard = false,
  onSaveItems,
  onSubmit,
}: Props) {
  const editable = consignment.status === "draft";
  const [items, setItems] = useState<ConsignmentItem[]>(
    consignment.items.length ? consignment.items : [],
  );
  const [wizardOpen, setWizardOpen] = useState(
    autoStartWizard && customer.role === "public",
  );

  useEffect(() => {
    setItems(consignment.items.length ? consignment.items : []);
  }, [consignment.items]);

  const barcodeErrors =
    customer.role === "business"
      ? items.map((_, index) =>
          businessBarcodeError(items, index, customer.profile.vendorCodes),
        )
      : [];
  const hasBarcodeErrors = barcodeErrors.some(Boolean);

  return (
    <Stack spacing={2}>
      <ConsignmentEditorHeader
        consignment={consignment}
        editable={editable}
        hasValidationErrors={hasBarcodeErrors}
        onSaveItems={() => onSaveItems(consignment.id, items)}
        onSubmit={() => onSubmit(consignment.id)}
      />
      {hasBarcodeErrors ? (
        <Typography color="error">
          Business item barcodes are required, must use 000-0000, must be
          unique, and must belong to one of your assigned vendor codes.
        </Typography>
      ) : null}
      {customer.role === "business" ? (
        <Card variant="outlined">
          <CardContent>
            <Suspense fallback={<LinearProgress />}>
              <BusinessConsignmentGrid
                editable={editable}
                items={items}
                itemTypes={itemTypes}
                barcodeErrors={barcodeErrors}
                onItemsChange={setItems}
              />
            </Suspense>
          </CardContent>
        </Card>
      ) : (
        <PublicConsignmentItems
          editable={editable}
          items={items}
          itemTypes={itemTypes}
          onRemoveItem={(index) =>
            setItems((current) =>
              current.filter((_, itemIndex) => itemIndex !== index),
            )
          }
        />
      )}
      <Button
        variant="outlined"
        disabled={!editable}
        startIcon={<Plus size={18} />}
        onClick={() => {
          if (customer.role === "public") {
            setWizardOpen(true);
          } else {
            setItems((current) => [...current, { ...emptyItem }]);
          }
        }}
      >
        Add Item
      </Button>
      {customer.role === "public" && editable && wizardOpen ? (
        <Suspense fallback={<LinearProgress />}>
          <PublicItemWizard
            open
            itemTypes={itemTypes}
            equipmentManufacturers={equipmentManufacturers}
            onClose={() => setWizardOpen(false)}
            onAddItem={async (item) => {
              const nextItems = [...items, item];
              setItems(nextItems);
              await onSaveItems(consignment.id, nextItems);
            }}
          />
        </Suspense>
      ) : null}
    </Stack>
  );
}
