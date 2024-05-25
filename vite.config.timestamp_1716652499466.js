// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";
import { createApp } from "vinxi";
import { config } from "vinxi/plugins/config";
var csr = defineConfig({
  build: {
    outDir: "dist"
  },
  optimizeDeps: {
    include: ["react", "react-dom", "openai"]
  },
  ssr: {
    external: ["openai"],
    optimizeDeps: {
      include: ["openai"]
    }
  }
});
var vite_config_default = createApp({
  devtools: true,
  routers: [
    {},
    {
      name: "client",
      type: "spa",
      handler: "./index.html",
      plugins: () => [
        tsconfigPaths(),
        // devServer({
        //   entry: "src/hono.ts", // The file path of your application.
        //   exclude: [
        //     // We need to override this option since the default setting doesn't fit
        //     /.*\.tsx?($|\?)/,
        //     /.*\.(s?css|less)($|\?)/,
        //     /.*\.(svg|png)($|\?)/,
        //     /^\/@.+$/,
        //     /^\/favicon\.ico$/,
        //     /^\/(public|assets|static|dev-dist)\/.+/,
        //     /^\/manifest\.webmanifest$/,
        //     /^\/manifest\.json$/,
        //     /^\/dev-sw.js/,
        //     /^\/node_modules\/.*/,
        //   ],
        //   injectClientScript: false,
        // }),
        react(),
        VitePWA({
          base: "/",
          srcDir: "src/service-worker",
          filename: "sw.ts",
          injectRegister: "inline",
          strategies: "injectManifest",
          registerType: "autoUpdate",
          useCredentials: true,
          devOptions: {
            enabled: true,
            type: "module"
          },
          workbox: {
            globPatterns: ["**/*.{ts,tsx,js,css,html,ico,png,svg}"],
            sourcemap: true
          },
          includeAssets: ["favicon.ico", "apple-touch-icon.png"],
          manifest: {
            name: "Openrizz",
            short_name: "Openrizz",
            theme_color: "#000000",
            icons: [
              {
                src: "/assets/pwa/android-chrome-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any maskable"
              },
              {
                src: "/assets/pwa/android-chrome-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable"
              }
            ]
          }
        }),
        TanStackRouterVite(),
        config("custom", csr)
      ]
    }
  ]
});
export {
  vite_config_default as default
};
