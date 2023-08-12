import { generateOpenApiDocument } from "trpc-openapi";
import { appRouter } from "~/server/api/root";
import { env } from "~/env.mjs";

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: "Figma Plugins OpenAPI",
  version: "1.0.0",
  baseUrl: env.OPENAPI_BASE_URL,
});
