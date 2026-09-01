import { AuthProvider } from "react-oidc-context";
import { BrowserRouter } from "react-router-dom";
import { AuthStateBridge, authProviderProps } from "./auth";
import { PortalShell } from "./components/PortalShell";

export function App() {
  return (
    <AuthProvider {...authProviderProps}>
      <AuthStateBridge />
      <BrowserRouter>
        <PortalShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
