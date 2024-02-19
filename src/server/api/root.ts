import { diagrammatonRouter } from "./routers/diagrammaton";
import { createTRPCRouter } from "~/server/api/trpc";
import { apiKeyRouter } from "./routers/apikey";
import { licenseKeyRouter } from "./routers/license";

export const appRouter = createTRPCRouter({
  apiKey: apiKeyRouter,
  license: licenseKeyRouter,
  diagrammaton: diagrammatonRouter,
});

export type AppRouter = typeof appRouter;
