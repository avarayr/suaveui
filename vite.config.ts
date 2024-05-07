import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";
import devServer from "@hono/vite-dev-server";
// https://vitejs.dev/config/

export default defineConfig({
  build: {
    outDir: "dist",
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
  plugins: [
    devServer({
      entry: "src/hono.ts", // The file path of your application.
      exclude: [
        // We need to override this option since the default setting doesn't fit
        /.*\.tsx?($|\?)/,
        /.*\.(s?css|less)($|\?)/,
        /.*\.(svg|png)($|\?)/,
        /^\/@.+$/,
        /^\/favicon\.ico$/,
        /^\/(public|assets|static|dev-dist)\/.+/,
        /^\/node_modules\/.*/,
      ],
      injectClientScript: false,
    }),
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
