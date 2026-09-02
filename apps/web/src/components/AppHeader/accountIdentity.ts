import type { Customer } from "@expresspass/shared";

export function accountLabel(customer: Customer | null, fallback?: string) {
  if (!customer) return fallback ?? "Account";
  if (customer.role === "business" && customer.profile.businessName) {
    return customer.profile.businessName;
  }
  return `${customer.profile.firstName} ${customer.profile.lastName}`;
}

export function accountInitials(customer: Customer | null, fallback?: string) {
  const label = accountLabel(customer, fallback);
  const words = label.trim().split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "?";
}

export function accountSubtitle(customer: Customer | null, fallback?: string) {
  const vendorCodes = customer?.profile.vendorCodes ?? [];
  if (vendorCodes.length > 0) return `vendor ${vendorCodes.join(", ")}`;
  return customer?.email ?? fallback ?? "";
}
