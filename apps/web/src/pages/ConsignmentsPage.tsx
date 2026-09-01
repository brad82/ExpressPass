import { Card, CardContent } from "@mui/material";
import type {
  Consignment,
  ConsignmentItem,
  Customer,
  ItemType,
} from "@expresspass/shared";
import {
  useCreateConsignmentMutation,
  useSubmitConsignmentMutation,
  useUpdateConsignmentItemsMutation,
} from "../api";
import { ConsignmentWorkspace } from "../components/ConsignmentWorkspace/index";

type Props = {
  customer: Customer;
  consignments: Consignment[];
  itemTypes: ItemType[];
  equipmentManufacturers: string[];
};

export default function ConsignmentsPage({
  customer,
  consignments,
  itemTypes,
  equipmentManufacturers,
}: Props) {
  const [createConsignment] = useCreateConsignmentMutation();
  const [updateConsignmentItems] = useUpdateConsignmentItemsMutation();
  const [submitConsignment] = useSubmitConsignmentMutation();

  return (
    <Card variant="outlined">
      <CardContent>
        <ConsignmentWorkspace
          customer={customer}
          consignments={consignments}
          itemTypes={itemTypes}
          equipmentManufacturers={equipmentManufacturers}
          onCreate={async () => {
            const created = await createConsignment().unwrap();
            return created.id;
          }}
          onSaveItems={async (id: string, items: ConsignmentItem[]) => {
            await updateConsignmentItems({ id, items }).unwrap();
          }}
          onSubmit={async (id: string) => {
            await submitConsignment(id).unwrap();
          }}
        />
      </CardContent>
    </Card>
  );
}
