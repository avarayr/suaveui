import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import "dotenv/config";
import { Hono } from "hono";
import { eventHandler, toWebRequest } from "vinxi/http";
import { appRouter } from "./server/api/root";
import { db } from "./server/db";

const app = new Hono().basePath("/api");

function setupRoutes(app: Hono) {
  app.use("/trpc/*", (c) =>
    fetchRequestHandler({
      router: appRouter,
      req: c.req.raw,
      endpoint: "/api/trpc",
      createContext: () => ({ headers: new Headers() }),
    }),
  );
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

setupRoutes(app);
setupSignalHandlers();

export default eventHandler(async (event) => {
  return app.fetch(toWebRequest(event));
});
