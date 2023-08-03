import { generateOpenApiDocument } from "trpc-openapi";
import { appRouter } from "~/server/api/root";

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: "tRPC OpenAPI",
  version: "1.0.0",
  baseUrl: "https://pete-dev.loca.lt/api",
});
