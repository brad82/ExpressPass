import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Consignment, Customer } from "@expresspass/shared";
import { store } from "../../store";
import { ConsignmentWorkspace } from "./index";

vi.mock("../ConsignmentStatusView", () => ({
  ConsignmentStatusView: () => <div>Item Status view</div>,
}));

vi.mock("../../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api")>()),
  useGetConsignmentStatusQuery: () => ({ data: [], isLoading: false }),
}));

const customer = {
  id: "0196a5ca-e000-7000-8000-0000000000aa",
  role: "public",
  profile: { vendorCodes: [] },
} as unknown as Customer;

function consignment(
  id: string,
  status: Consignment["status"],
): Consignment {
  return { id, status, items: [] };
}

afterEach(() => {
  cleanup();
});

function renderWorkspace(consignments: Consignment[]) {
  return render(
    <Provider store={store}>
      <ConsignmentWorkspace
        customer={customer}
        consignments={consignments}
        itemTypes={[]}
        equipmentManufacturers={[]}
        onCreate={vi.fn().mockResolvedValue("new-id")}
        onSaveItems={vi.fn()}
        onSubmit={vi.fn()}
      />
    </Provider>,
  );
}

describe("ConsignmentWorkspace", () => {
  it("shows the editable editor for a draft consignment", () => {
    renderWorkspace([
      consignment("0196a5ca-e000-7000-8000-000000000001", "draft"),
    ]);
    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Add Item/ })).toBeEnabled();
  });

  it("disables the New button while a draft consignment already exists", () => {
    renderWorkspace([
      consignment("0196a5ca-e000-7000-8000-000000000001", "draft"),
    ]);
    expect(screen.getByRole("button", { name: /New/ })).toBeDisabled();
  });

  it("allows a New consignment when none are drafts", () => {
    renderWorkspace([
      consignment("0196a5ca-e000-7000-8000-000000000002", "submitted"),
    ]);
    expect(screen.getByRole("button", { name: /New/ })).toBeEnabled();
  });

  it("renders a submitted consignment read-only (no submit/add actions)", () => {
    renderWorkspace([
      consignment("0196a5ca-e000-7000-8000-000000000002", "submitted"),
    ]);
    expect(
      screen.queryByRole("button", { name: "Submit" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Item/ })).toBeDisabled();
    expect(screen.getByText("Status: Submitted")).toBeInTheDocument();
  });

  it("shows the item-status view for a received consignment", async () => {
    renderWorkspace([
      consignment("0196a5ca-e000-7000-8000-000000000003", "received"),
    ]);
    expect(
      await screen.findByText("Item Status view"),
    ).toBeInTheDocument();
  });

  it("switches the rendered consignment when another tab is selected", async () => {
    renderWorkspace([
      consignment("0196a5ca-e000-7000-8000-000000000001", "draft"),
      consignment("0196a5ca-e000-7000-8000-000000000003", "received"),
    ]);
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Received/ }));

    expect(await screen.findByText("Item Status view")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Submit" }),
    ).not.toBeInTheDocument();
  });
});
