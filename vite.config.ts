import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import path from "node:path";

// Self-hosted build: Nitro maakt een Node-server (.output/server/index.mjs).
export default defineConfig(async ({ command }) => {
  const plugins = [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    // src/server.ts is onze SSR-wrapper (foutpagina bij crashes)
    tanstackStart({ server: { entry: "server" } }),
  ];
  if (command === "build") {
    const { nitro } = await import("nitro/vite");
    plugins.push(nitro({ preset: "node-server" }));
  }
  plugins.push(viteReact());

  return {
    plugins,
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
