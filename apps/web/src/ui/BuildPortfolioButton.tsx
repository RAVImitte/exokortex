import { FolderKanban } from "lucide-react";
import { useState } from "react";
import { api, messageOf } from "../api/client.js";
import { Button } from "./Button.js";
import { useToast } from "./Toast.js";

export function BuildPortfolioButton({
  size = "md",
  variant = "secondary",
}: {
  size?: "md" | "sm";
  variant?: "primary" | "secondary";
}) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function build() {
    setBusy(true);
    try {
      const body = await api<{ url: string; projects: number; pullRequest: boolean }>(
        "/api/portfolio/build",
        { method: "POST" },
      );
      toast.success(
        body.pullRequest
          ? `Pull request opened for ${body.projects} projects.`
          : `Portfolio files written for ${body.projects} projects.`,
      );
      window.open(body.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(messageOf(err, "Could not build the portfolio"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      icon={FolderKanban}
      loading={busy}
      onClick={() => void build()}
    >
      Build portfolio
    </Button>
  );
}
