import { appRouter } from "./src/server/api/root";
import type { HattipHandler } from "@hattip/core";
import { createRouter } from "@hattip/router";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import "dotenv/config";
import { db } from "./src/server/db";

const router = createRouter();

router.use("/api/trpc/*", (context) => {
  return fetchRequestHandler({
    router: appRouter,
    req: context.request,
    endpoint: "/api/trpc",
    createContext({ req }) {
      return { req };
    },
  });
});

export default router.buildHandler() as HattipHandler;

async function exitHandler(evtOrExitCodeOrError: number | string | Error) {
  console.log(`Openrizz is shutting down`);
  try {
    await db.close();
  } catch (e) {
    console.error("EXIT HANDLER ERROR", e);
  }

  process.exit(isNaN(+evtOrExitCodeOrError) ? 1 : +evtOrExitCodeOrError);
}

[
  "beforeExit",
  "uncaughtException",
  "unhandledRejection",
  "SIGHUP",
  "SIGINT",
  "SIGQUIT",
  "SIGILL",
  "SIGTRAP",
  "SIGABRT",
  "SIGBUS",
  "SIGFPE",
  "SIGUSR1",
  "SIGSEGV",
  "SIGUSR2",
  "SIGTERM",
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
].forEach((evt) => process.on(evt, exitHandler));
