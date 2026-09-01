import { useEffect, useRef } from "react";
import { useAuth } from "react-oidc-context";

export function useAuthSession() {
  const auth = useAuth();
  const signInStarted = useRef(false);
  const userName = auth.user?.profile.name ?? auth.user?.profile.email;

  useEffect(() => {
    if (
      auth.isLoading ||
      auth.isAuthenticated ||
      auth.activeNavigator ||
      auth.error ||
      signInStarted.current
    ) {
      return;
    }

    signInStarted.current = true;
    void auth.signinRedirect({
      state: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    });
  }, [
    auth.activeNavigator,
    auth.error,
    auth.isAuthenticated,
    auth.isLoading,
    auth.signinRedirect,
  ]);

  async function loadPortal() {
    if (!auth.isAuthenticated) {
      await auth.signinRedirect();
    }
  }

  return {
    error: auth.error?.message ?? null,
    isReady: !auth.isLoading && !auth.activeNavigator,
    loadPortal,
    signOut: () => auth.signoutRedirect(),
    userName,
  };
}
