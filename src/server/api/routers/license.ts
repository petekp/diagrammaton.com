import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { generateLicenseKey } from "@/lib/utils";

export const licenseKeyRouter = createTRPCRouter({
  getUserLicenseKey: protectedProcedure.query(async ({ ctx }) => {
    const existingLicenseKey = await ctx.prisma.licenseKey.findFirst({
      where: {
        userId: ctx.session.user.id,
      },
    });

    return existingLicenseKey ? existingLicenseKey.key : null;
  }),
  generateLicenseKey: protectedProcedure.mutation(async ({ ctx }) => {
    const licenseKey = generateLicenseKey();

    const oneYearFromNowDt = new Date(
      new Date().getTime() + 1000 * 60 * 60 * 24 * 365
    );

    const existingLicenseKey = await ctx.prisma.licenseKey.findFirst({
      where: {
        userId: ctx.session.user.id,
      },
    });

    if (existingLicenseKey) {
      await ctx.prisma.licenseKey.update({
        where: {
          id: existingLicenseKey.id,
        },
        data: {
          key: licenseKey,
          expiresAt: oneYearFromNowDt,
        },
      });
    } else {
      await ctx.prisma.licenseKey.create({
        data: {
          userId: ctx.session.user.id,
          key: licenseKey,
          uses: 0,
          expiresAt: oneYearFromNowDt,
        },
      });
    }

    return licenseKey;
  }),
  validateLicenseKey: publicProcedure
    .input(
      z.object({
        licenseKey: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const decodedKey = Buffer.from(input.licenseKey, "base64").toString();

      const license = await ctx.prisma.licenseKey.findUnique({
        where: {
          key: decodedKey,
        },
      });

      if (
        !license ||
        license.revoked ||
        (license.expiresAt && license.expiresAt < new Date())
      ) {
        return false;
      }

      return true;
    }),
});
