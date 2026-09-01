import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { store } from "./store";

vi.mock("react-oidc-context", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    activeNavigator: undefined,
    error: undefined,
    isAuthenticated: false,
    isLoading: true,
    signinRedirect: vi.fn(),
    signoutRedirect: vi.fn(),
    user: undefined,
  }),
}));

vi.mock("./auth", () => ({
  AuthStateBridge: () => null,
  authProviderProps: {},
}));

describe("App", () => {
  it("renders the portal title", () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );
    expect(screen.getByText("Express Pass")).toBeInTheDocument();
  });
});
