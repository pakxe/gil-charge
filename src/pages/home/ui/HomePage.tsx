import { PATHS } from "@/shared/lib/route";
import { Navigate } from "react-router";

export function HomePage() {
    return <Navigate to={PATHS.selectStep} replace />;
}
