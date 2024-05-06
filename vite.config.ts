import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";
import { hattip } from "@hattip/vite";
// https://vitejs.dev/config/

export default defineConfig({
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
  plugins: [
    hattip(),
    react(),
    tsconfigPaths(),
    VitePWA({
      injectRegister: "auto",
      registerType: "autoUpdate",
      useCredentials: true,
      devOptions: {
        enabled: true,
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html}"],
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "Openrizz",
        short_name: "Openrizz",
        theme_color: "#000000",
        icons: [
          {
            src: "/pwa/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/pwa/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
    TanStackRouterVite(),
  ],
});
