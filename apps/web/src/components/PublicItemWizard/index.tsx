import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useMemo, useReducer } from "react";
import { type ConsignmentItem, type ItemType } from "@expresspass/shared";
import { useGetPricingGuideQuery } from "../../api";
import {
  buildDescription,
  CategoryStep,
  DescriptionStep,
  hasRequiredDescriptionFields,
  OptionsStep,
  PriceStep,
} from "./steps";
import { initialPublicItemWizardState, publicItemWizardReducer } from "./state";

type Props = {
  open: boolean;
  itemTypes: ItemType[];
  equipmentManufacturers: string[];
  onClose: () => void;
  onAddItem: (item: ConsignmentItem) => Promise<void>;
};

const steps = ["Category", "Description", "Price", "Options"];

export function PublicItemWizard({
  open,
  itemTypes,
  equipmentManufacturers,
  onClose,
  onAddItem,
}: Props) {
  const [{ step, item, descriptionFields }, dispatch] = useReducer(
    publicItemWizardReducer,
    initialPublicItemWizardState,
  );
  const selectedType = itemTypes.find(
    (itemType) => itemType.id === item.itemType,
  );
  const hasDescriptionFields = hasRequiredDescriptionFields(descriptionFields);
  const description = useMemo(
    () => buildDescription(descriptionFields, selectedType),
    [descriptionFields, selectedType],
  );
  const pricingGuideQuery = useGetPricingGuideQuery(item.itemType, {
    skip: item.itemType < 1,
  });
  const priceGuide = pricingGuideQuery.data?.markdown ?? "";

  function reset() {
    dispatch({ type: "reset" });
  }

  function close() {
    reset();
    onClose();
  }

  async function addItem() {
    await onAddItem({
      ...item,
      description,
      itemSize: descriptionFields.size || item.itemSize,
    });
    close();
  }

  const canContinue =
    (step === 0 && item.itemType > 0) ||
    (step === 1 && hasDescriptionFields) ||
    (step === 2 && item.priceCents > 0) ||
    step === 3;

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack>
            <Typography variant="h2">Add an Item</Typography>
            <Typography variant="body2" color="text.secondary">
              Step {step + 1} of {steps.length}: {steps[step]}
            </Typography>
          </Stack>
          <Button variant="text" startIcon={<X size={18} />} onClick={close}>
            Close
          </Button>
        </Stack>
      </DialogTitle>
      <LinearProgress
        variant="determinate"
        value={((step + 1) / steps.length) * 100}
      />
      <DialogContent>
        {step === 0 ? (
          <CategoryStep
            itemTypes={itemTypes}
            selectedItemType={item.itemType}
            onSelect={(itemType) =>
              dispatch({ type: "selectItemType", itemType })
            }
          />
        ) : null}

        {step === 1 ? (
          <DescriptionStep
            fields={descriptionFields}
            isNew={item.new}
            description={description}
            equipmentManufacturers={equipmentManufacturers}
            onFieldsChange={(fields) =>
              dispatch({ type: "updateDescription", fields })
            }
            onNewChange={(isNew) =>
              dispatch({ type: "updateItem", patch: { new: isNew } })
            }
          />
        ) : null}

        {step === 2 ? (
          <PriceStep
            priceCents={item.priceCents}
            pricingGuide={priceGuide}
            pricingGuideLoading={
              pricingGuideQuery.isLoading || pricingGuideQuery.isFetching
            }
            onPriceChange={(priceCents) =>
              dispatch({ type: "updateItem", patch: { priceCents } })
            }
          />
        ) : null}

        {step === 3 ? (
          <OptionsStep
            item={item}
            description={description}
            selectedType={selectedType}
            size={descriptionFields.size || item.itemSize}
            onRedTagChange={(redTag) =>
              dispatch({ type: "updateItem", patch: { redTag } })
            }
          />
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          startIcon={<ArrowLeft size={18} />}
          disabled={step === 0}
          onClick={() => dispatch({ type: "goToStep", step: step - 1 })}
        >
          Back
        </Button>
        {step < steps.length - 1 ? (
          <Button
            endIcon={<ArrowRight size={18} />}
            disabled={!canContinue}
            onClick={() => dispatch({ type: "goToStep", step: step + 1 })}
          >
            Continue
          </Button>
        ) : (
          <Button
            startIcon={<Check size={18} />}
            disabled={!canContinue}
            onClick={addItem}
          >
            Add Item
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
