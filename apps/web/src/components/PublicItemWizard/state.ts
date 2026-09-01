import type { ConsignmentItem } from "@expresspass/shared";
import { emptyItem } from "../../types";
import {
  defaultDescriptionFields,
  type DescriptionFields,
} from "./description";

export type PublicItemWizardState = {
  step: number;
  item: ConsignmentItem;
  descriptionFields: DescriptionFields;
};

type Action =
  | { type: "reset" }
  | { type: "goToStep"; step: number }
  | { type: "selectItemType"; itemType: number }
  | { type: "updateItem"; patch: Partial<ConsignmentItem> }
  | { type: "updateDescription"; fields: DescriptionFields };

export const initialPublicItemWizardState: PublicItemWizardState = {
  step: 0,
  item: { ...emptyItem },
  descriptionFields: defaultDescriptionFields,
};

export function publicItemWizardReducer(
  state: PublicItemWizardState,
  action: Action,
): PublicItemWizardState {
  switch (action.type) {
    case "reset":
      return {
        ...initialPublicItemWizardState,
        item: { ...emptyItem },
      };
    case "goToStep":
      return { ...state, step: action.step };
    case "selectItemType":
      return {
        ...state,
        step: 1,
        item: { ...state.item, itemType: action.itemType },
      };
    case "updateItem":
      return { ...state, item: { ...state.item, ...action.patch } };
    case "updateDescription":
      return { ...state, descriptionFields: action.fields };
  }
}
