import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type AuthSessionState = {
  accessToken?: string;
  expiresAt?: number;
  subject?: string;
};

const initialState: AuthSessionState = {};

const authSessionSlice = createSlice({
  name: "authSession",
  initialState,
  reducers: {
    authSessionChanged: (
      _state,
      action: PayloadAction<AuthSessionState>,
    ): AuthSessionState => action.payload,
  },
});

export const { authSessionChanged } = authSessionSlice.actions;

export const authSessionReducer = authSessionSlice.reducer;

export function selectAccessToken(state: {
  authSession: AuthSessionState;
}): string | undefined {
  return state.authSession.accessToken;
}
