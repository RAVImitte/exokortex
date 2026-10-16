import { useCallback, useEffect, useState } from "react";

export type ThemeChoice = "system" | "light" | "dark";

const storageKey = "exokortex-theme";
const query = "(prefers-color-scheme: dark)";
const changeEvent = "exokortex-theme-change";

export function readTheme(): ThemeChoice {
  const stored = localStorage.getItem(storageKey);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function resolve(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  return window.matchMedia(query).matches ? "dark" : "light";
}

function apply(choice: ThemeChoice): void {
  document.documentElement.dataset.theme = resolve(choice);
}

export function useTheme(): {
  choice: ThemeChoice;
  resolved: "light" | "dark";
  setChoice: (choice: ThemeChoice) => void;
} {
  const [choice, setState] = useState<ThemeChoice>(readTheme);
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolve(readTheme()));

  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => {
      const next = readTheme();
      setState(next);
      apply(next);
      setResolved(resolve(next));
    };
    media.addEventListener("change", sync);
    window.addEventListener(changeEvent, sync);
    window.addEventListener("storage", sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener(changeEvent, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setChoice = useCallback((next: ThemeChoice) => {
    if (next === "system") localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, next);
    window.dispatchEvent(new Event(changeEvent));
  }, []);

  return { choice, resolved, setChoice };
}
