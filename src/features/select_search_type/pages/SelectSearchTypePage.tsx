import { useNavigate } from "react-router";

import {
    SelectTypeStep,
    type SearchTypeId,
} from "@/features/select_search_type/components/SelectTypeStep";
import { PATHS } from "@/shared/utils/route";

const SEARCH_TYPE_PATHS: Record<SearchTypeId, string> = {
    waypoint: PATHS.waypoint,
    "station-name": PATHS.searchStationName,
};

export function SelectSearchTypePage() {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <SelectTypeStep onSelect={(searchTypeId) => navigate(SEARCH_TYPE_PATHS[searchTypeId])} />
        </div>
    );
}
