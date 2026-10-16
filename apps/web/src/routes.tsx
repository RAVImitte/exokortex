import { LoaderCircle } from "lucide-react";
import { motion } from "motion/react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ActivityPage } from "./pages/ActivityPage.js";
import { AiPage } from "./pages/AiPage.js";
import { ApprovalsPage } from "./pages/ApprovalsPage.js";
import { ConnectionsPage } from "./pages/ConnectionsPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { ProjectsPage } from "./pages/ProjectsPage.js";
import { RepositoriesPage } from "./pages/RepositoriesPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";

export function Loading() {
  return (
    <div className="loading-screen" aria-busy="true">
      <LoaderCircle size={22} className="spinner" />
    </div>
  );
}

export function AppRoutes() {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <Routes location={location}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/repositories" element={<RepositoriesPage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/ai" element={<AiPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </motion.div>
  );
}
