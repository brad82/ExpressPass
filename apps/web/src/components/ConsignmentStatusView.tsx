import { useState } from "react";
import { Chip, Stack, Tooltip, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { CircleDollarSign, History, PackageCheck } from "lucide-react";
import { formatCents, type GearshiftItemSnapshot } from "@expresspass/shared";
import { ItemHistoryDrawer } from "./ItemHistoryDrawer";

type Props = {
  consignmentId: string;
  items: GearshiftItemSnapshot[];
};

export function ConsignmentStatusView({ consignmentId, items }: Props) {
  const [historyItem, setHistoryItem] = useState<GearshiftItemSnapshot | null>(
    null,
  );

  const sold = items.reduce((total, item) => total + item.qtySold, 0);
  const checked = items.reduce((total, item) => total + item.qtyChecked, 0);

  const columns: GridColDef<GearshiftItemSnapshot>[] = [
    {
      field: "barcode",
      headerName: "Barcode",
      width: 140,
      valueFormatter: (value: string | undefined) => value ?? "—",
    },
    {
      field: "description",
      headerName: "Item",
      flex: 1.4,
      minWidth: 200,
    },
    {
      field: "itemTypeName",
      headerName: "Type",
      width: 140,
      valueGetter: (_value, row) => row.itemTypeName ?? String(row.itemType),
    },
    { field: "itemSize", headerName: "Size", width: 100 },
    {
      field: "qtyChecked",
      headerName: "Checked",
      type: "number",
      width: 110,
    },
    { field: "qtySold", headerName: "Sold", type: "number", width: 90 },
    {
      field: "valueSoldCents",
      headerName: "Value Sold",
      type: "number",
      width: 130,
      valueGetter: (_value, row) => row.valueSoldCents ?? 0,
      valueFormatter: (value: number) => formatCents(value),
    },
    {
      field: "history",
      headerName: "",
      width: 56,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: "center",
      renderCell: () => (
        <Tooltip title="Item history">
          <History size={16} />
        </Tooltip>
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <CircleDollarSign size={22} />
        <Typography variant="h2">Item Status</Typography>
      </Stack>
      <Stack direction="row" spacing={1}>
        <Chip
          icon={<PackageCheck size={18} />}
          label={`${checked} checked in`}
        />
        <Chip
          icon={<CircleDollarSign size={18} />}
          label={`${sold} sold`}
          color="success"
        />
      </Stack>
      {items.length === 0 ? (
        <Typography color="text.secondary">
          No item updates received from the sale yet.
        </Typography>
      ) : (
        <DataGrid
          autoHeight
          rows={items}
          columns={columns}
          showToolbar
          disableRowSelectionOnClick
          hideFooterSelectedRowCount
          onRowClick={(params) => setHistoryItem(params.row)}
          initialState={{
            sorting: { sortModel: [{ field: "description", sort: "asc" }] },
          }}
          sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
        />
      )}
      <ItemHistoryDrawer
        consignmentId={consignmentId}
        item={historyItem}
        onClose={() => setHistoryItem(null)}
      />
    </Stack>
  );
}
