import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";
import { createApp } from "vinxi";
import { config } from "vinxi/plugins/config";

export default createApp({
  devtools: true,
  server: {
    routeRules: {
      "/**": {
        headers: {
          "Cross-Origin-Opener-Policy": "same-origin",
          "Cross-Origin-Resource-Policy": "same-origin",
          "Cross-Origin-Embedder-Policy": "require-corp",
        },
      },
    },
  },
  routers: [
    {
      type: "http",
      target: "server",
      base: "/api",
      handler: "./src/hono.ts",
      name: "api",
      plugins: () => [tsconfigPaths()],
    },
    {
      name: "client",
      type: "spa",
      handler: "./index.html",
      plugins: () => [
        config("custom", {
          optimizeDeps: {
            include: ["react", "react-dom", "openai"],
          },
          worker: {
            format: "es",
          },
        }),
        tsconfigPaths(),
        react({
          babel: {
            plugins: [["babel-plugin-react-compiler", {}]],
          },
        }),
        VitePWA({
          base: "/",
          srcDir: "src/service-worker",
          filename: "sw.ts",
          injectRegister: "auto",
          strategies: "injectManifest",
          registerType: "autoUpdate",
          useCredentials: true,
          injectManifest: {
            rollupFormat: "es",
          },
          devOptions: {
            enabled: true,
            type: "module",
          },
          workbox: {
            globPatterns: ["**/*.{ts,tsx,js,css,html,ico,png,svg}"],
            sourcemap: true,
          },
          includeAssets: ["favicon.ico", "apple-touch-icon.png"],
          manifest: {
            name: "SuaveUI",
            short_name: "SuaveUI",
            theme_color: "#000000",
            icons: [
              {
                src: "/assets/pwa/android-chrome-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any maskable",
              },
              {
                src: "/assets/pwa/android-chrome-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable",
              },
            ],
          },
        }),
        TanStackRouterVite(),
      ],
    },
  ],
});
