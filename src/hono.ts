import { serveStatic } from "@hono/node-server/serve-static";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import "dotenv/config";
import { Hono } from "hono";
import { appRouter } from "./server/api/root";
import { db } from "./server/db";
import fs from "fs/promises";
import followMessage from "./server/api/direct/follow-message";

const { NODE_ENV = "production", PORT = 3001 } = process.env;
const isDev = NODE_ENV === "development";

const app = new Hono();

/**
 * @see https://vitejs.dev/guide/backend-integration.html#backend-integration
 */
function injectViteClient(_html: string) {
  return _html.replace(
    "<head>",
    `
  <script type="module">
    import RefreshRuntime from "/@react-refresh"
    RefreshRuntime.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => {}
    window.$RefreshSig$ = () => (type) => type
    window.__vite_plugin_react_preamble_installed__ = true
  </script>

  <script type="module" src="/@vite/client"></script>
  `,
  );
}

async function getHtml() {
  const htmlFilePath = isDev ? "index.html" : "dist/index.html";
  const htmlFile = await fs.readFile(htmlFilePath, "utf-8");
  return isDev ? injectViteClient(htmlFile) : htmlFile;
}

function setupRoutes(app: Hono) {
  const assetsRoot = isDev ? "./" : "dist/";

  const paths = [
    "/assets/*",
    "/manifest.webmanifest",
    "/manifest.json",
    "/dev-sw.js",
    "/sw.js",
    "/workbox-*.js",
  ] as const;

  for (const path of paths) {
    app.use(path, serveStatic({ root: assetsRoot }));
  }

  app.use("/api/trpc/*", (c) =>
    fetchRequestHandler({
      router: appRouter,
      req: c.req.raw,
      endpoint: "/api/trpc",
      createContext: () => ({ headers: new Headers() }),
    }),
  );

  app.route("/api/", followMessage);

  app.get("/*", async (c) => c.html(await getHtml()));
}

async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  try {
    await db.close();
    console.log("Database connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
}

function setupSignalHandlers() {
  // Check if we've already added the listeners
  if ((globalThis as { _signal_handlers_added__?: boolean })?._signal_handlers_added__) {
    return;
  }

  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGQUIT", "SIGHUP", "SIGABRT"];
  signals.forEach((signal) => {
    process.on(signal, () => void gracefulShutdown(signal));
  });

  (globalThis as unknown as { _signal_handlers_added__: boolean })._signal_handlers_added__ = true;

  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
  });

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
  });
}

function startServer() {
  /**
   * Don't start the server in development mode
   */
  if (isDev) {
    return;
  }

  const serverOptions = {
    fetch: app.fetch,
    port: +PORT,
    development: isDev,
  } satisfies Parameters<typeof Bun.serve>[0];

  Bun.serve(serverOptions);
  console.log(`Server is running in ${NODE_ENV} mode on port ${PORT}`);
}

setupRoutes(app);
setupSignalHandlers();
startServer();

export default app;
