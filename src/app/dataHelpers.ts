import handleError, {
  DiagrammatonError,
  InvalidLicenseKey,
  UserNotFound,
} from "~/server/api/routers/errors";
import { prisma } from "~/server/db";
import { logError } from "~/utils/log";

export async function fetchUserByLicenseKey(licenseKey: string) {
  const licenseKeys = await prisma.licenseKey.findMany({
    where: { key: licenseKey },
  });

  if (!licenseKeys.length) {
    throw new InvalidLicenseKey({ input: { licenseKey } });
  }

  const user = await prisma.user.findUnique({
    where: { id: licenseKeys[0]?.userId },
    select: { id: true, email: true, openaiApiKey: true },
  });

  if (!user) {
    throw new UserNotFound({ input: { licenseKey } });
  }

  return { user, licenseKeys };
}

export async function verifyLicenseKey(key: string) {
  try {
    const licenseKey = await prisma.licenseKey.findUnique({
      where: {
        key,
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
  }
}
