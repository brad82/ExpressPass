import { configureStore } from "@reduxjs/toolkit";
import { consignmentApi } from "../api";
import { authSessionReducer } from "./authSessionSlice";

export { authSessionChanged, selectAccessToken } from "./authSessionSlice";
export type { AuthSessionState } from "./authSessionSlice";

export const store = configureStore({
  reducer: {
    authSession: authSessionReducer,
    [consignmentApi.reducerPath]: consignmentApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(consignmentApi.middleware),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
