import { createBrowserRouter, Navigate, RouterProvider } from "react-router";

import { PATHS } from "@/shared/utils/route";
import { SelectSearchTypePage } from "@/features/select_search_type/pages/SelectSearchTypePage";
import { WaypointSearchPage } from "@/features/select_search_type/pages/WaypointSearchPage";
import { HomePage } from "@/features/home/pages/HomePage";
import { MobileLayout } from "@/shared/components/MobileLayout/MobileLayout";
import { ShowMapPocPage } from "@/features/poc/pages/ShowMapPocPage";
import { WaypointEditorPage } from "@/features/waypoint_editor/pages/WaypointEditorPage";
import PomoGame from "./game/src/App";

const router = createBrowserRouter([
    {
        path: PATHS.pomo,
        element: <PomoGame />,
    },
    {
        path: PATHS.showMapPoc,
        element: <ShowMapPocPage />,
    },
    {
        path: PATHS.waypointEditorPoc,
        element: <WaypointEditorPage />,
    },
    {
        element: <MobileLayout />,
        children: [
            {
                path: PATHS.home,
                element: <HomePage />,
            },
            {
                path: PATHS.selectStep,
                element: <SelectSearchTypePage />,
            },
            {
                path: PATHS.selectSearchType,
                element: <Navigate to={PATHS.selectStep} replace />,
            },
            {
                path: PATHS.waypoint,
                element: <WaypointSearchPage />,
            },
        ],
    },
]);

function App() {
    return (
        <>
            <RouterProvider router={router} />
        </>
    );
}

export default App;
