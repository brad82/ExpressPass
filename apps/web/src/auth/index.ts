import type { AuthProviderProps } from "react-oidc-context";

export { AuthStateBridge } from "./AuthStateBridge";

function requiredViteEnv(name: string): string {
  const value = import.meta.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required Vite environment variable: ${name}`);
  }
  return value;
}

const OIDC_AUTHORITY = requiredViteEnv("VITE_OIDC_AUTHORITY");

export const authProviderProps: AuthProviderProps = {
  authority: OIDC_AUTHORITY,
  client_id: requiredViteEnv("VITE_OIDC_CLIENT_ID"),
  redirect_uri: requiredViteEnv("VITE_OIDC_REDIRECT_URI"),
  post_logout_redirect_uri: requiredViteEnv(
    "VITE_OIDC_POST_LOGOUT_REDIRECT_URI",
  ),
  response_type: "code",
  scope: requiredViteEnv("VITE_OIDC_SCOPE"),
  onSigninCallback: (user) => {
    const returnPath =
      typeof user?.state === "string" && user.state.startsWith("/")
        ? user.state
        : "/";
    window.history.replaceState({}, document.title, returnPath);
  },
};
