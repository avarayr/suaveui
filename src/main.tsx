import "./styles/globals.css";
import "./styles/hljs.css";
import "@la55u/react-spring-bottom-sheet-updated/dist/style.css";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { routeTree } from "./routeTree.gen";
import { TRPCReactProvider } from "./trpc/react";
import { Toaster } from "sonner";

registerSW({
  immediate: true,
  onOfflineReady() {
    console.log("SW is ready");
  },
  onNeedRefresh() {
    location.reload();
  },
});

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <TRPCReactProvider>
        <Toaster
          theme={"dark"}
          richColors
          className="toaster group"
          position="bottom-center"
          toastOptions={{
            className: "!text-base",
          }}
        />
        <RouterProvider router={router} />
      </TRPCReactProvider>
    </StrictMode>,
  );
}
