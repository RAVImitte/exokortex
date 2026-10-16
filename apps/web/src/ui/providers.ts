import { Boxes, ChartLine, GitBranch, NotebookPen, Plug, type LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "./Toast.js";

export interface ProviderMeta {
  label: string;
  icon: LucideIcon;
  description: string;
}

export const providers: Record<string, ProviderMeta> = {
  github: {
    label: "GitHub",
    icon: GitBranch,
    description: "Install the GitHub App. Your portfolio repository lives here.",
  },
  google: {
    label: "Google Colab",
    icon: NotebookPen,
    description: "Colab notebooks you own in Google Drive become sources.",
  },
  huggingface: {
    label: "Hugging Face",
    icon: Boxes,
    description: "Models, datasets, and spaces you own become sources.",
  },
  kaggle: {
    label: "Kaggle",
    icon: ChartLine,
    description: "Datasets and notebooks you own become sources.",
  },
};

export function providerMeta(provider: string | undefined): ProviderMeta {
  return (
    providers[provider ?? "github"] ?? {
      label: provider ?? "Source",
      icon: Plug,
      description: "",
    }
  );
}

export function useConnectedToast(): void {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const connected = params.get("connected");
  const shown = useRef<string | null>(null);

  useEffect(() => {
    if (connected === null || shown.current === connected) return;
    shown.current = connected;
    toast.success(`Connected. ${connected} repositories stored. The first scan is queued.`);
    const next = new URLSearchParams(params);
    next.delete("connected");
    setParams(next, { replace: true });
  }, [connected, params, setParams, toast]);
}
