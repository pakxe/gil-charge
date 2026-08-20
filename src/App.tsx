import { type ReactNode } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";

import { PATHS } from "@/shared/utils/route";
import { SelectSearchTypePage } from "@/features/select_search_type/pages/SelectSearchTypePage";
import { WaypointSearchPage } from "@/features/select_search_type/pages/WaypointSearchPage";
import { HomePage } from "@/features/home/pages/HomePage";
import { MobileLayout } from "@/shared/components/MobileLayout/MobileLayout";
import { ShowMapPocPage } from "@/features/poc/pages/ShowMapPocPage";
import { WaypointEditorPage } from "@/features/waypoint_editor/pages/WaypointEditorPage";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary/ErrorBoundary";
import { ToastProvider } from "@/shared/ui/Toast/ToastProvider";
import PomoGame from "./game/src/App";

const router = createBrowserRouter([
    {
        path: PATHS.pomo,
        element: withPageErrorBoundary(<PomoGame />),
    },
    {
        path: PATHS.showMapPoc,
        element: withPageErrorBoundary(<ShowMapPocPage />),
    },
    {
        path: PATHS.waypointEditorPoc,
        element: withPageErrorBoundary(<WaypointEditorPage />),
    },
    {
        element: <MobileLayout />,
        children: [
            {
                path: PATHS.home,
                element: withPageErrorBoundary(<HomePage />),
            },
            {
                path: PATHS.selectStep,
                element: withPageErrorBoundary(<SelectSearchTypePage />),
            },
            {
                path: PATHS.selectSearchType,
                element: <Navigate to={PATHS.selectStep} replace />,
            },
            {
                path: PATHS.waypoint,
                element: withPageErrorBoundary(<WaypointSearchPage />),
            },
        ],
    },
]);

function withPageErrorBoundary(element: ReactNode) {
    return <ErrorBoundary>{element}</ErrorBoundary>;
}

function App() {
    return (
        <ErrorBoundary>
            <ToastProvider>
                <RouterProvider router={router} />
            </ToastProvider>
        </ErrorBoundary>
    );
}

export default App;
