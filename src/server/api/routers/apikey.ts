import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "../../db";

const apiKeyLastFourSchema = z.string().nullable();

export const apiKeyRouter = createTRPCRouter({
  validate: protectedProcedure
    .input(z.string())
    .output(z.boolean())
    .mutation(async ({ input }) => {
      const response = await fetch("https://api.openai.com/v1/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${input}`,
        },
        body: JSON.stringify({
          prompt: "a",
          model: "ada",
          max_tokens: 1,
        }),
      });

      return response.status === 200;
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
});
