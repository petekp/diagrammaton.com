import { exampleRouter } from "~/server/api/routers/example";
import { createTRPCRouter } from "~/server/api/trpc";
import { apiKeyRouter } from "./routers/apikey";
import { licenseKeyRouter } from "./routers/license";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  apiKey: apiKeyRouter,
  license: licenseKeyRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
