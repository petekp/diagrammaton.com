import { type TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc";
import { logError } from "../../../utils/log";
import { TRPCError } from "@trpc/server";
import { LogArgument } from "rollbar";

export default function handleError(
  err: {
    logArgs?: LogArgument;
  } & Error
) {
  logError(err.message, err.logArgs);

  if (err instanceof DiagrammatonError) {
    throw new TRPCError({ message: err.message, code: err.code });
  }

  throw new TRPCError({
    message: "Unexpected error",
    code: "INTERNAL_SERVER_ERROR",
  });
}

class DiagrammatonError extends Error {
  logArgs: unknown;
  code: TRPC_ERROR_CODE_KEY;
  constructor({
    message,
    code,
    logArgs,
  }: {
    message: string;
    code: TRPC_ERROR_CODE_KEY;
    logArgs?: unknown;
  }) {
    super(message);
    this.code = code;
    this.logArgs = logArgs;
  }
}

export class RateLimitExceededError extends DiagrammatonError {
  constructor(data?: unknown) {
    super({
      message: "Rate limit exceeded",
      code: "TOO_MANY_REQUESTS",
      logArgs: data,
    });
  }
}
export class NoDescriptionProvided extends DiagrammatonError {
  constructor(data?: unknown) {
    super({
      message: "No diagram description provided",
      code: "BAD_REQUEST",
      logArgs: data,
    });
  }
}
export class InvalidLicenseKey extends DiagrammatonError {
  constructor(data?: unknown) {
    super({
      message: "Invalid license key",
      code: "UNAUTHORIZED",
      logArgs: data,
    });
  }
}
export class InvalidApiKey extends DiagrammatonError {
  constructor(data?: unknown) {
    super({
      message: "API key must be a string",
      code: "BAD_REQUEST",
      logArgs: data,
    });
  }
}
export class OpenAiError extends DiagrammatonError {
  constructor(data?: unknown) {
    super({
      message: "OpenAI API error",
      code: "INTERNAL_SERVER_ERROR",
      logArgs: data,
    });
  }
}
export class UserNotFound extends DiagrammatonError {
  constructor(data?: unknown) {
    super({
      message: "User not found",
      code: "UNAUTHORIZED",
      logArgs: data,
    });
  }
}
export class ApiKeyNotFoundForUser extends DiagrammatonError {
  constructor(data?: unknown) {
    super({
      message: "No OpenAI API key registered",
      code: "BAD_REQUEST",
      logArgs: data,
    });
  }
}
export class GPTFailedToCallFunction extends DiagrammatonError {
  constructor(data?: unknown) {
    super({
      message: "GPT failed to utilize function_call",
      code: "INTERNAL_SERVER_ERROR",
      logArgs: data,
    });
  }
}
export class UnableToParseGPTResponse extends DiagrammatonError {
  constructor(data?: unknown) {
    super({
      message: "Unable to parse GPT response",
      code: "INTERNAL_SERVER_ERROR",
      logArgs: data,
    });
  }
}
