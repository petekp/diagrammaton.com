import handleError, {
  DiagrammatonError,
  InvalidLicenseKey,
  UserNotFound,
} from "~/server/api/routers/errors";
import { prisma } from "~/server/db";
import { logError } from "~/utils/log";
import type { LicenseKey } from "@prisma/client";

export type LicensedUser = {
  id: string;
  email: string | null;
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
};

export async function fetchUserByLicenseKey(
  licenseKey: string
): Promise<{ user: LicensedUser; licenseKeys: LicenseKey[] }> {
  const license = await prisma.licenseKey.findFirst({
    where: {
      key: licenseKey,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!license) {
    throw new InvalidLicenseKey({ input: { licenseKey } });
  }

  const user = await prisma.user.findUnique({
    where: { id: license.userId },
    select: { id: true, email: true, openaiApiKey: true, anthropicApiKey: true },
  });

  if (!user) {
    throw new UserNotFound({ input: { licenseKey } });
  }

  return { user: user as LicensedUser, licenseKeys: [license] };
}

export async function verifyLicenseKey(key: string) {
  try {
    const licenseKey = await prisma.licenseKey.findFirst({
      where: {
        key,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!licenseKey) {
      throw new InvalidLicenseKey({ input: licenseKey });
    }

    return {
      success: true,
      message: "License key is valid",
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
      message: "Unable to verify license key due to a server error",
    };
  }
}
