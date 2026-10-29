import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage.js";
const WorkspaceApp = lazy(() => import("./WorkspaceApp.js"));
export function App() {
  const { pathname } = useLocation();
  if (pathname === "/") return <LandingPage />;
  return (
    <Suspense
      fallback={
        <div className="loading-screen" role="status">
          Opening your workspace…
        </div>
      }
    >
      <WorkspaceApp />
    </Suspense>
  );
}
