import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "../../db";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const apiKeyLastFourSchema = z.string().nullable();

export const apiKeyRouter = createTRPCRouter({
  validate: protectedProcedure
    .input(z.string())
    .output(z.boolean())
    .mutation(async ({ input }) => {
      try {
        const client = new OpenAI({ apiKey: input });
        // Minimal, non-invasive call that works across model generations
        await client.models.list();
        return true;
      } catch {
        return false;
      }
    }),
  validateAnthropic: protectedProcedure
    .input(z.string())
    .output(z.boolean())
    .mutation(async ({ input }) => {
      try {
        const client = new Anthropic({ apiKey: input });
        await client.models.list();
        return true;
      } catch {
        return false;
      }
    }),
  getUserKeyLastFour: protectedProcedure
    .output(apiKeyLastFourSchema)
    .query(async ({ ctx }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { openaiApiKeyLastFour: true },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return user?.openaiApiKeyLastFour ?? null;
    }),
  getUserAnthropicKeyLastFour: protectedProcedure
    .output(apiKeyLastFourSchema)
    .query(async ({ ctx }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { anthropicApiKeyLastFour: true },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return user?.anthropicApiKeyLastFour ?? null;
    }),
  setUserApiKey: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        apiKey: z.string(),
      })
    )
    .output(apiKeyLastFourSchema)
    .mutation(async ({ ctx, input }) => {
      const updatedUser = await prisma.user.update({
        where: { id: ctx.session.user.id },
        data: {
          openaiApiKey: input.apiKey,
          openaiApiKeyLastFour: input.apiKey.slice(-4),
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return updatedUser.openaiApiKeyLastFour;
    }),
  setUserAnthropicApiKey: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        apiKey: z.string(),
      })
    )
    .output(apiKeyLastFourSchema)
    .mutation(async ({ ctx, input }) => {
      const updatedUser = await prisma.user.update({
        where: { id: ctx.session.user.id },
        data: {
          anthropicApiKey: input.apiKey,
          anthropicApiKeyLastFour: input.apiKey.slice(-4),
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return updatedUser.anthropicApiKeyLastFour;
    }),
});
