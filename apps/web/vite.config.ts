import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }
          if (id.includes("@mui/x-data-grid")) {
            return "mui-data-grid";
          }
          if (
            id.includes("@mui/material") ||
            id.includes("@mui/system") ||
            id.includes("@mui/utils") ||
            id.includes("@emotion/")
          ) {
            return "mui";
          }
          if (
            id.includes("react-oidc-context") ||
            id.includes("oidc-client-ts")
          ) {
            return "auth";
          }
          if (
            id.includes("@reduxjs/toolkit") ||
            id.includes("react-redux") ||
            id.includes("redux")
          ) {
            return "redux";
          }
          if (
            id.includes("react/") ||
            id.includes("react-dom/") ||
            id.includes("react-router-dom")
          ) {
            return "react";
          }
          if (id.includes("lucide-react")) {
            return "icons";
          }
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@expresspass/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url),
      ),
    },
  },
  server: {
    port: 3000,
  },
});
