import { PATHS } from "@/shared/utils/route";
import { Navigate } from "react-router";

export function HomePage() {
    return <Navigate to={PATHS.selectSearchType} replace />;
}
