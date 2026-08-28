import { type ReactNode } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";

import { PATHS } from "@/shared/utils/route";
import { WaypointEditorPage } from "@/pages/waypoint_editor/ui/WaypointEditorPage";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary/ErrorBoundary";
import { ToastProvider } from "@/shared/ui/Toast/ToastProvider";

const router = createBrowserRouter([
    {
        path: PATHS.waypointEditorPoc,
        element: withPageErrorBoundary(<WaypointEditorPage />),
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
