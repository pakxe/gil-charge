import { useNavigate } from "react-router";

import { SelectTypeStep } from "@/features/select_search_type/components/SelectTypeStep";
import { PATHS } from "@/shared/utils/route";

export function SelectSearchTypePage() {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <SelectTypeStep onNext={() => navigate(PATHS.waypoint)} />
        </div>
    );
}
