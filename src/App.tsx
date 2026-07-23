import { createBrowserRouter, RouterProvider } from "react-router";
// import GasStationMap from "./GasStationMap";
import { PATHS } from "@/shared/utils/route";
import { SelectSearchTypePage } from "@/features/select_search_type/pages/SelectSearchTypePage";
import { MobileLayout } from "@/shared/components/MobileLayout/MobileLayout";
import PomoGame from "./game/src/App";

const router = createBrowserRouter([
    {
        path: PATHS.pomo,
        element: <PomoGame />,
    },
    {
        element: <MobileLayout />,
        children: [
            {
                path: PATHS.home,
                element: <SelectSearchTypePage />,
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
