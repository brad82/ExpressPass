import {
  useGetConsignmentsQuery,
  useGetEquipmentManufacturersQuery,
  useGetItemTypesQuery,
  useGetMeQuery,
  useGetNotificationsQuery,
} from "../api";

function errorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }
  if (typeof error === "object" && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === "string") {
      return data;
    }
    if (data && typeof data === "object" && "message" in data) {
      return String((data as { message?: unknown }).message);
    }
    return "Request failed";
  }
  if (typeof error === "object" && "error" in error) {
    return String((error as { error?: unknown }).error ?? "Request failed");
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function usePortalData(shouldLoadPortal: boolean) {
  const meQuery = useGetMeQuery(undefined, { skip: !shouldLoadPortal });
  const consignmentsQuery = useGetConsignmentsQuery(undefined, {
    skip: !shouldLoadPortal,
  });
  const itemTypesQuery = useGetItemTypesQuery(undefined, {
    skip: !shouldLoadPortal,
  });
  const equipmentManufacturersQuery = useGetEquipmentManufacturersQuery(
    undefined,
    { skip: !shouldLoadPortal },
  );
  const notificationsQuery = useGetNotificationsQuery(undefined, {
    skip: !shouldLoadPortal,
  });

  const customer = meQuery.data ?? null;
  const consignments = consignmentsQuery.data ?? [];
  const itemTypes = itemTypesQuery.data ?? [];
  const equipmentManufacturers = equipmentManufacturersQuery.data ?? [];
  const notifications = notificationsQuery.data ?? [];
  const unread = notifications.filter(
    (notification) => !notification.readAt,
  ).length;

  return {
    consignments,
    customer,
    equipmentManufacturers,
    error:
      errorMessage(meQuery.error) ??
      errorMessage(consignmentsQuery.error) ??
      errorMessage(itemTypesQuery.error) ??
      errorMessage(equipmentManufacturersQuery.error) ??
      errorMessage(notificationsQuery.error),
    isLoading:
      meQuery.isLoading ||
      consignmentsQuery.isLoading ||
      itemTypesQuery.isLoading ||
      equipmentManufacturersQuery.isLoading ||
      notificationsQuery.isLoading,
    itemTypes,
    latestConsignment: consignments[0],
    notifications,
    unread,
  };
}
