import { generateOpenApiDocument } from "trpc-openapi";
import { appRouter } from "~/server/api/root";
import { env } from "~/env.mjs";

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: "tRPC OpenAPI",
  version: "1.0.0",
  baseUrl:
    env.NODE_ENV === "production"
      ? "https://figma-plugins-pete.vercel.app/api"
      : "https://pete-dev.loca.lt/api",
});
