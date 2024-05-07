import { serveStatic } from "@hono/node-server/serve-static";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import "dotenv/config";
import { Hono } from "hono";
import { appRouter } from "./server/api/root";
import { db } from "./server/db";

const { NODE_ENV = "production", PORT = 3001 } = process.env;
const isDev = NODE_ENV === "development";

const app = new Hono();

function injectViteClient(html: string) {
  return html.replace(
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
  const htmlFile = await Bun.file(htmlFilePath).text();
  return isDev ? injectViteClient(htmlFile) : htmlFile;
}

function setupRoutes(app: Hono) {
  const assetsRoot = isDev ? "./" : "dist/";
  app.use("/assets/*", serveStatic({ root: assetsRoot }));

  app.use("/api/trpc/*", (c) =>
    fetchRequestHandler({
      router: appRouter,
      req: c.req.raw,
      endpoint: "/api/trpc",
      createContext: () => ({ headers: new Headers() }),
    }),
  );

  app.get("/*", async (c) => c.html(await getHtml()));
}

async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Openrizz is shutting down gracefully...`);
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
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGQUIT", "SIGHUP", "SIGABRT"];
  signals.forEach((signal) => {
    process.on(signal, () => gracefulShutdown(signal));
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
    process.exit(1);
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
