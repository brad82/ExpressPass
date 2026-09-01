import { useEffect, useRef } from "react";
import { useAuth } from "react-oidc-context";
import { useDispatch } from "react-redux";
import { consignmentApi } from "../api";
import { authSessionChanged, type AppDispatch } from "../store";

export function AuthStateBridge() {
  const auth = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const previousSubject = useRef<string | undefined>(undefined);

  const activeUser = auth.user && !auth.user.expired ? auth.user : undefined;
  const accessToken = activeUser?.access_token;
  const expiresAt = activeUser?.expires_at;
  const subject = activeUser?.profile.sub;

  useEffect(() => {
    dispatch(authSessionChanged({ accessToken, expiresAt, subject }));
  }, [accessToken, dispatch, expiresAt, subject]);

  useEffect(() => {
    if (
      previousSubject.current !== undefined &&
      previousSubject.current !== subject
    ) {
      dispatch(consignmentApi.util.resetApiState());
    }
    previousSubject.current = subject;
  }, [dispatch, subject]);

  return null;
}
