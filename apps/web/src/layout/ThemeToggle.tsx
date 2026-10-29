import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeChoice } from "../theme.js";
import { IconButton } from "../ui/Button.js";

const nextTheme: Record<ThemeChoice, ThemeChoice> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const themeIcon = { system: Monitor, light: Sun, dark: Moon };

export function ThemeToggle() {
  const { choice, setChoice } = useTheme();
  return (
    <IconButton
      icon={themeIcon[choice]}
      label={`Theme: ${choice}. Switch to ${nextTheme[choice]}`}
      size="sm"
      onClick={() => setChoice(nextTheme[choice])}
    />
  );
}
