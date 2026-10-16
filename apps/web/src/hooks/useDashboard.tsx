import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api/client.js";
import type { DashboardSnapshot } from "../api/types.js";

interface DashboardState {
  data: DashboardSnapshot | null;
  error: string;
  refresh: () => Promise<void>;
}

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState("");
  const { pathname } = useLocation();

  const refresh = useCallback(async () => {
    try {
      setData(await api<DashboardSnapshot>("/api/dashboard"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  const value = useMemo(() => ({ data, error, refresh }), [data, error, refresh]);
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardState {
  const value = useContext(DashboardContext);
  if (!value) throw new Error("useDashboard needs a DashboardProvider");
  return value;
}
