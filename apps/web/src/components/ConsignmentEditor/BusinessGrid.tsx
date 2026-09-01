import { IconButton, Stack, Tooltip } from "@mui/material";
import { Copy, Trash2 } from "lucide-react";
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
  type GridRowsProp,
} from "@mui/x-data-grid";
import {
  centsToDollarInput,
  dollarInputToCents,
  type ConsignmentItem,
  type ItemType,
} from "@expresspass/shared";

type Props = {
  editable: boolean;
  items: ConsignmentItem[];
  itemTypes: ItemType[];
  barcodeErrors: string[];
  onItemsChange: (items: ConsignmentItem[]) => void;
};

type BusinessItemRow = ConsignmentItem & {
  rowId: number;
  barcodeError: string;
  priceDollars: string;
};

export function BusinessConsignmentGrid({
  editable,
  items,
  itemTypes,
  barcodeErrors,
  onItemsChange,
}: Props) {
  const rows: GridRowsProp<BusinessItemRow> = items.map((item, index) => ({
    ...item,
    rowId: index,
    barcodeError: barcodeErrors[index] ?? "",
    priceDollars: centsToDollarInput(item.priceCents),
  }));
  const columns: GridColDef<BusinessItemRow>[] = [
    {
      field: "description",
      headerName: "Description",
      flex: 1.4,
      minWidth: 220,
      editable,
    },
    {
      field: "barcode",
      headerName: "Barcode",
      width: 150,
      editable,
    },
    {
      field: "itemType",
      headerName: "Type",
      type: "singleSelect",
      valueOptions: itemTypes.map((itemType) => ({
        value: itemType.id,
        label: itemType.description,
      })),
      width: 180,
      editable,
    },
    { field: "itemSize", headerName: "Size", width: 120, editable },
    {
      field: "priceDollars",
      headerName: "Price",
      type: "number",
      width: 120,
      editable,
    },
    { field: "qty", headerName: "Qty", type: "number", width: 90, editable },
    { field: "new", headerName: "New", type: "boolean", width: 90, editable },
    {
      field: "redTag",
      headerName: "Red Tag",
      type: "boolean",
      width: 100,
      editable,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 110,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams<BusinessItemRow>) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Duplicate row">
            <span>
              <IconButton
                size="small"
                disabled={!editable}
                onClick={() =>
                  onItemsChange([
                    ...items.slice(0, params.row.rowId + 1),
                    { ...items[params.row.rowId], barcode: "" },
                    ...items.slice(params.row.rowId + 1),
                  ])
                }
              >
                <Copy size={18} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Delete row">
            <span>
              <IconButton
                size="small"
                disabled={!editable}
                onClick={() =>
                  onItemsChange(
                    items.filter(
                      (_, itemIndex) => itemIndex !== params.row.rowId,
                    ),
                  )
                }
              >
                <Trash2 size={18} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      getRowId={(row) => row.rowId}
      disableRowSelectionOnClick
      hideFooterSelectedRowCount
      processRowUpdate={(updatedRow) => {
        onItemsChange(
          items.map((item, index) =>
            index === updatedRow.rowId
              ? {
                  ...item,
                  barcode: updatedRow.barcode ?? "",
                  description: updatedRow.description,
                  itemType: Number(updatedRow.itemType),
                  itemSize: updatedRow.itemSize,
                  priceCents: dollarInputToCents(
                    String(updatedRow.priceDollars),
                  ),
                  qty: Number(updatedRow.qty),
                  new: Boolean(updatedRow.new),
                  redTag: Boolean(updatedRow.redTag),
                }
              : item,
          ),
        );
        return updatedRow;
      }}
      sx={{
        minHeight: 360,
        "& .barcode-error-cell": {
          border: "1px solid",
          borderColor: "error.main",
        },
      }}
    />
  );
}
