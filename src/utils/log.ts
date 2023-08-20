import Rollbar, { type LogArgument } from "rollbar";
import { env } from "~/env.mjs";

const rollbar = new Rollbar({
  accessToken: env.ROLLBAR_ACCESS_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true,
});

export function logError(message: string, data: LogArgument) {
  rollbar.error(message, data);
}

export function logInfo(
  message: string,
  data: LogArgument,
  callback?: () => void
) {
  rollbar.info(message, data, callback);
}
