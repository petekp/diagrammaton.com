import { z } from "zod";

import { logError } from "~/utils/log";
import { checkRateLimit } from "~/app/rateLimiter";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { fetchUserByLicenseKey, verifyLicenseKey } from "~/app/dataHelpers";
import handleError, { DiagrammatonError, NoFeedbackMessage } from "./errors";

export const diagrammatonRouter = createTRPCRouter({
  verify: publicProcedure
    .meta({ openapi: { method: "POST", path: "/diagrammaton/verify" } })
    .input(
      z.object({
        licenseKey: z.string(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx.ipAddress ?? input.licenseKey);
      return await verifyLicenseKey(input.licenseKey);
    }),

  feedback: publicProcedure
    .meta({ openapi: { method: "POST", path: "/diagrammaton/feedback" } })
    .input(
      z.object({
        licenseKey: z.string(),
        message: z.string(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx.ipAddress ?? input.licenseKey);

      if (!input.message) {
        throw new NoFeedbackMessage();
      }

      try {
        const { user } = await fetchUserByLicenseKey(input.licenseKey);

        await ctx.prisma.feedback.create({
          data: {
            message: input.message,
            userId: user.id,
          },
        });

        return {
          success: true,
          message: "Feedback successfully saved.",
        };
      } catch (err) {
        if (err instanceof DiagrammatonError) {
          console.error(err);
          logError(err.message, err.logArgs);
          return { success: false, message: err.message };
        }

        handleError(err as Error);
        return {
          success: false,
          message: "Unable to send feedback due to a erver error",
        };
      }
    }),
});
