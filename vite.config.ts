import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  resolve: {
    // Vite 8 resolves tsconfig "paths" (the "@/*" alias) natively.
    tsconfigPaths: true,
  },
  plugins: [
    tanstackStart(),
    // React's Vite plugin must come after TanStack Start's plugin.
    viteReact(),
    tailwindcss(),
    nitro(),
  ],
});
