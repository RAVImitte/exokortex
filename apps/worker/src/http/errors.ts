import { AppError, log } from "@exokortex/shared";
import type { ErrorHandler } from "hono";
import type { AppBindings } from "./types.js";

export const onError: ErrorHandler<AppBindings> = (error, c) => {
  if (error instanceof AppError) {
    return c.json({ error: { code: error.code, message: error.message } }, error.status as 400);
  }
  log("error", error instanceof Error ? error.message : "request failed");
  return c.json({ error: { code: "internal", message: "Something went wrong" } }, 500);
};
