import { createBrowserRouter, RouterProvider } from "react-router";
// import GasStationMap from "./GasStationMap";
import { PATHS } from "@/shared/utils/route";
import { SelectSearchTypePage } from "@/features/select_search_type/pages/SelectSearchTypePage";
import { HomePage } from "@/features/home/pages/HomePage";
import { MobileLayout } from "@/shared/components/MobileLayout/MobileLayout";

const router = createBrowserRouter([
    {
        element: <MobileLayout />,
        children: [
            {
                path: PATHS.home,
                element: <HomePage />,
            },
            {
                path: PATHS.selectSearchType,
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
