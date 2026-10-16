import {
  Activity,
  FolderGit2,
  FolderKanban,
  House,
  Inbox,
  Plug,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavLinkItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: "approvals";
}

export const navSections: { label: string; items: NavLinkItem[] }[] = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Home", icon: House },
      { to: "/approvals", label: "Approvals", icon: Inbox, badge: "approvals" },
      { to: "/activity", label: "Activity", icon: Activity },
      { to: "/projects", label: "Projects", icon: FolderKanban },
    ],
  },
  {
    label: "Sources",
    items: [
      { to: "/repositories", label: "Repositories", icon: FolderGit2 },
      { to: "/connections", label: "Connections", icon: Plug },
    ],
  },
  {
    label: "Setup",
    items: [
      { to: "/ai", label: "AI model", icon: Sparkles },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];
