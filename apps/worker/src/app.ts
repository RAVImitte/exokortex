import { Hono } from "hono";
import { cors } from "hono/cors";
import { onError } from "./http/errors.js";
import { requireUser } from "./http/require-user.js";
import type { AppBindings } from "./http/types.js";
import { registerAccountRoutes } from "./routes/account.js";
import { registerApprovalRoutes } from "./routes/approvals.js";
import { registerGitHubRoutes } from "./routes/github.js";
import { registerGoogleRoutes } from "./routes/google.js";
import { registerHuggingFaceRoutes } from "./routes/huggingface.js";
import { registerKaggleRoutes } from "./routes/kaggle.js";
import { registerLlmRoutes } from "./routes/llm.js";
import { registerRepositoryRoutes } from "./routes/repositories.js";
import { registerSessionRoutes } from "./routes/session.js";

export function createApp(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();
  app.use(
    "/api/*",
    cors({
      origin: ["http://127.0.0.1:5173", "http://localhost:5173"],
      credentials: true,
    }),
  );
  app.onError(onError);
  registerSessionRoutes(app);
  app.use("/api/*", requireUser);
  registerAccountRoutes(app);
  registerGitHubRoutes(app);
  registerGoogleRoutes(app);
  registerHuggingFaceRoutes(app);
  registerKaggleRoutes(app);
  registerRepositoryRoutes(app);
  registerApprovalRoutes(app);
  registerLlmRoutes(app);
  return app;
}
