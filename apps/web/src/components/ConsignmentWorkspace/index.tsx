import { lazy, Suspense, useEffect, useState } from "react";
import {
  Button,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { Plus } from "lucide-react";
import type {
  Consignment,
  ConsignmentItem,
  Customer,
  ItemType,
} from "@expresspass/shared";
import {
  friendlyConsignmentStatus,
  shortConsignmentId,
} from "../../consignmentStatus";
import { useGetConsignmentStatusQuery } from "../../api";
import { ConsignmentEditor } from "../ConsignmentEditor/index";

const ConsignmentStatusView = lazy(() =>
  import("../ConsignmentStatusView").then((module) => ({
    default: module.ConsignmentStatusView,
  })),
);

type Props = {
  customer: Customer;
  consignments: Consignment[];
  itemTypes: ItemType[];
  equipmentManufacturers: string[];
  onCreate: () => Promise<string>;
  onSaveItems: (id: string, items: ConsignmentItem[]) => Promise<void>;
  onSubmit: (id: string) => Promise<void>;
};

function ReceivedConsignment({ consignmentId }: { consignmentId: string }) {
  const { data, isLoading } = useGetConsignmentStatusQuery(consignmentId);
  if (isLoading) {
    return <LinearProgress />;
  }
  return (
    <Suspense fallback={<LinearProgress />}>
      <ConsignmentStatusView consignmentId={consignmentId} items={data ?? []} />
    </Suspense>
  );
}

export function ConsignmentWorkspace({
  customer,
  consignments,
  itemTypes,
  equipmentManufacturers,
  onCreate,
  onSaveItems,
  onSubmit,
}: Props) {
  const [selectedId, setSelectedId] = useState<string>();
  const [wizardConsignmentId, setWizardConsignmentId] = useState<string>();

  const selected =
    consignments.find((consignment) => consignment.id === selectedId) ??
    consignments.find((consignment) => consignment.status === "draft") ??
    consignments[0];

  // Only one draft per customer is allowed; once one exists, guide the customer
  // to submit it before starting another.
  const hasDraft = consignments.some(
    (consignment) => consignment.status === "draft",
  );

  useEffect(() => {
    if (selected && selected.id !== selectedId) {
      setSelectedId(selected.id);
    }
  }, [selected, selectedId]);

  async function createConsignment() {
    const id = await onCreate();
    setSelectedId(id);
    if (customer.role === "public") {
      setWizardConsignmentId(id);
    }
  }

  if (consignments.length === 0) {
    return (
      <Stack spacing={2}>
        <Typography variant="h2">Consignment</Typography>
        <Typography color="text.secondary">
          Create a draft consignment to start adding items.
        </Typography>
        <Button
          startIcon={<Plus size={18} />}
          onClick={createConsignment}
          sx={{ alignSelf: "flex-start" }}
        >
          New Consignment
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Tabs
          value={selected?.id ?? false}
          onChange={(_event, value: string) => setSelectedId(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ maxWidth: "100%" }}
        >
          {consignments.map((consignment) => (
            <Tab
              key={consignment.id}
              value={consignment.id}
              label={`#${shortConsignmentId(consignment.id)} · ${
                friendlyConsignmentStatus[consignment.status]
              }`}
            />
          ))}
        </Tabs>
        <Tooltip
          title={
            hasDraft
              ? "Submit your current draft consignment before starting another."
              : ""
          }
        >
          <span>
            <Button
              variant="outlined"
              startIcon={<Plus size={18} />}
              onClick={createConsignment}
              disabled={hasDraft}
            >
              New
            </Button>
          </span>
        </Tooltip>
      </Stack>
      {selected ? (
        selected.status === "received" ? (
          <ReceivedConsignment
            key={selected.id}
            consignmentId={selected.id}
          />
        ) : (
          <ConsignmentEditor
            key={selected.id}
            customer={customer}
            consignment={selected}
            itemTypes={itemTypes}
            equipmentManufacturers={equipmentManufacturers}
            autoStartWizard={wizardConsignmentId === selected.id}
            onSaveItems={onSaveItems}
            onSubmit={onSubmit}
          />
        )
      ) : null}
    </Stack>
  );
}
