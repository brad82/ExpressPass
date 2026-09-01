import type {
  BusinessInformation,
  Consignment,
  ConsignmentItem,
  Customer,
  GearshiftItemEvent,
  GearshiftItemSnapshot,
  IdentityProfile,
  ItemType,
  NotificationPreferences,
} from "@expresspass/shared";
import {
  createApi,
  fetchBaseQuery,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import {
  selectAccessToken,
  type AuthSessionState,
} from "./store/authSessionSlice";

function apiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (!configured?.trim()) {
    throw new Error(
      "Missing required Vite environment variable: VITE_API_BASE_URL",
    );
  }
  return configured;
}

const API_BASE_URL = apiBaseUrl();

export type NotificationRow = {
  id: string;
  eventType: string;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
};

export type PricingGuide = {
  itemType: number;
  markdown: string;
};

export type ApiError = FetchBaseQueryError;

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, api) => {
    const accessToken = selectAccessToken(
      api.getState() as { authSession: AuthSessionState },
    );
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    return headers;
  },
});

export const consignmentApi = createApi({
  reducerPath: "consignmentApi",
  baseQuery,
  tagTypes: [
    "Customer",
    "Catalog",
    "Consignments",
    "Notifications",
    "ConsignmentStatus",
  ],
  endpoints: (builder) => ({
    getMe: builder.query<Customer, void>({
      query: () => "/me",
      providesTags: ["Customer"],
    }),
    updateProfile: builder.mutation<Customer, IdentityProfile>({
      query: (profile) => ({
        url: "/me/profile",
        method: "PUT",
        body: profile,
      }),
      invalidatesTags: ["Customer"],
    }),
    updateBusinessInformation: builder.mutation<Customer, BusinessInformation>({
      query: (information) => ({
        url: "/me/business-information",
        method: "PUT",
        body: information,
      }),
      invalidatesTags: ["Customer"],
    }),
    updateNotificationPreferences: builder.mutation<
      Customer,
      NotificationPreferences
    >({
      query: (preferences) => ({
        url: "/me/notification-preferences",
        method: "PUT",
        body: preferences,
      }),
      invalidatesTags: ["Customer"],
    }),
    getItemTypes: builder.query<ItemType[], void>({
      query: () => "/catalog/item-types",
      providesTags: ["Catalog"],
    }),
    getEquipmentManufacturers: builder.query<string[], void>({
      query: () => "/catalog/equipment-manufacturers",
      providesTags: ["Catalog"],
    }),
    getPricingGuide: builder.query<PricingGuide, number>({
      query: (itemType) => `/catalog/pricing-guides/${itemType}`,
      providesTags: (_result, _error, itemType) => [
        { type: "Catalog", id: `pricing-guide-${itemType}` },
      ],
    }),
    getConsignments: builder.query<Consignment[], void>({
      query: () => "/consignments",
      providesTags: ["Consignments"],
    }),
    createConsignment: builder.mutation<Consignment, void>({
      query: () => ({ url: "/consignments", method: "POST" }),
      invalidatesTags: ["Consignments"],
    }),
    updateConsignmentItems: builder.mutation<
      Consignment,
      { id: string; items: ConsignmentItem[] }
    >({
      query: ({ id, items }) => ({
        url: `/consignments/${id}`,
        method: "PATCH",
        body: { items },
      }),
      invalidatesTags: ["Consignments"],
    }),
    submitConsignment: builder.mutation<
      Consignment & { s3Key: string },
      string
    >({
      query: (id) => ({ url: `/consignments/${id}/submit`, method: "POST" }),
      invalidatesTags: ["Consignments"],
    }),
    getNotifications: builder.query<NotificationRow[], void>({
      query: () => "/notifications",
      providesTags: ["Notifications"],
    }),
    markNotificationRead: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "POST" }),
      invalidatesTags: ["Notifications"],
    }),
    getConsignmentStatus: builder.query<GearshiftItemSnapshot[], string>({
      query: (id) => `/consignments/${id}/status`,
      providesTags: (_result, _error, id) => [
        { type: "ConsignmentStatus", id },
      ],
    }),
    getItemHistory: builder.query<
      GearshiftItemEvent[],
      { consignmentId: string; gearshiftItemId: string }
    >({
      query: ({ consignmentId, gearshiftItemId }) =>
        `/consignments/${consignmentId}/status/${encodeURIComponent(
          gearshiftItemId,
        )}/history`,
      providesTags: (_result, _error, { consignmentId, gearshiftItemId }) => [
        { type: "ConsignmentStatus", id: `${consignmentId}:${gearshiftItemId}` },
      ],
    }),
  }),
});

export const {
  useCreateConsignmentMutation,
  useGetConsignmentStatusQuery,
  useGetConsignmentsQuery,
  useGetItemHistoryQuery,
  useGetEquipmentManufacturersQuery,
  useGetItemTypesQuery,
  useGetMeQuery,
  useGetNotificationsQuery,
  useGetPricingGuideQuery,
  useMarkNotificationReadMutation,
  useSubmitConsignmentMutation,
  useUpdateBusinessInformationMutation,
  useUpdateConsignmentItemsMutation,
  useUpdateNotificationPreferencesMutation,
  useUpdateProfileMutation,
} = consignmentApi;
