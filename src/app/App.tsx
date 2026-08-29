import { type ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router";

import { PATHS } from "@/shared/lib/route";
import { HomePage } from "@/pages/home/ui/HomePage";
import { SearchStationByPathPage } from "@/pages/search-station-by-path/ui/SearchStationByPathPage";
import { SearchStationByNamePage } from "@/pages/search-station-by-name/ui/SearchStationByNamePage";
import { SelectSearchTypePage } from "@/pages/search-type-selection/ui/SelectSearchTypePage";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary/ErrorBoundary";
import { ToastProvider } from "@/shared/ui/Toast/ToastProvider";

const router = createBrowserRouter([
    {
        element: <AppLayout />,
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
                path: PATHS.searchStationByPath,
                element: withPageErrorBoundary(<SearchStationByPathPage />),
            },
            {
                path: PATHS.searchStationByName,
                element: withPageErrorBoundary(<SearchStationByNamePage />),
            },
        ],
    },
]);

function withPageErrorBoundary(element: ReactNode) {
    return <ErrorBoundary>{element}</ErrorBoundary>;
}

function AppLayout() {
    return (
        <div className="min-h-dvh bg-gil-gray-850 text-gil-light-text">
            <div className="relative mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden bg-gil-bg">
                <Outlet />
            </div>
        </div>
    );
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
