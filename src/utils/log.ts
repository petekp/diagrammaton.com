import Rollbar, { type LogArgument } from "rollbar";
import { env } from "~/env.mjs";

const rollbar = new Rollbar({
  accessToken: env.ROLLBAR_ACCESS_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true,
});

export function logError(message: string, data: LogArgument) {
  console.log("logError called");
  console.error(message, data);
  try {
    rollbar.error(message, data, (err, payload) => {
      if (err) {
        console.error("Failed to send error log to Rollbar:", err);
      } else {
        console.log(
          "Sent error log to Rollbar, payload ID:",
          (payload as { id: unknown }).id
        );
      }
    });
  } catch (err) {
    console.error("Failed to log error to Rollbar:", err);
  }
}

export function logInfo(
  message: string,
  data: LogArgument,
  callback?: () => void
) {
  console.info(message, data);
  rollbar.info(message, data, callback);
}
