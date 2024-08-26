import { aiRouter } from "./routers/ai";
import { chatRouter } from "./routers/chat";
import { notificationRouter } from "./routers/notification";
import { personaRouter } from "./routers/persona";
import { createCallerFactory, router } from "~/server/api/trpc";
import { settingsRouter } from "./routers/settings";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = router({
  chat: chatRouter,
  persona: personaRouter,
  ai: aiRouter,
  notification: notificationRouter,
  settings: settingsRouter,
  // ... other routers
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
