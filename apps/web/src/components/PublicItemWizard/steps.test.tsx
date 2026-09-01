import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ItemType } from "@expresspass/shared";
import {
  buildDescription,
  CategoryStep,
  defaultDescriptionFields,
  DescriptionStep,
  hasRequiredDescriptionFields,
} from "./steps";

const itemTypes: ItemType[] = [
  {
    id: 1,
    description: "Alpine Skis",
    shortName: "SKI",
    taxable1: true,
    taxable2: false,
  },
  {
    id: 2,
    description: "Snowboard",
    shortName: "SNBD",
    taxable1: true,
    taxable2: false,
  },
];

describe("PublicItemWizardSteps", () => {
  it("selects a category through the category step", () => {
    const onSelect = vi.fn();
    render(
      <CategoryStep
        itemTypes={itemTypes}
        selectedItemType={1}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText("Snowboard"));

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("marks brand, model, and size as required fields", () => {
    render(
      <DescriptionStep
        fields={defaultDescriptionFields}
        isNew={false}
        description=""
        equipmentManufacturers={["Rossignol", "Salomon"]}
        onFieldsChange={vi.fn()}
        onNewChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/Brand/)).toBeRequired();
    expect(screen.getByLabelText(/Model/)).toBeRequired();
    expect(screen.getByLabelText(/Size/)).toBeRequired();
  });

  it("requires brand, model, and size before description step can continue", () => {
    expect(
      hasRequiredDescriptionFields({
        ...defaultDescriptionFields,
        brand: "Rossignol",
        model: "Hero",
      }),
    ).toBe(false);
    expect(
      hasRequiredDescriptionFields({
        ...defaultDescriptionFields,
        brand: "Rossignol",
        model: "Hero",
        size: "170",
      }),
    ).toBe(true);
  });

  it("builds the shopper-facing description from entered fields", () => {
    expect(
      buildDescription(
        {
          ...defaultDescriptionFields,
          brand: "Rossignol",
          model: "Hero",
          size: "170",
          condition: "Good",
          details: "Includes bindings",
        },
        itemTypes[0],
      ),
    ).toBe("Rossignol - Hero - Alpine Skis - Good - Includes bindings");
  });
});
