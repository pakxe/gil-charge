import { useNavigate } from "react-router";

import {
    SelectTypeStep,
    type SearchTypeId,
} from "@/features/search-type-selection/ui/SelectTypeStep";
import { PATHS } from "@/shared/lib/route";

const SEARCH_TYPE_PATHS: Record<SearchTypeId, string> = {
    "search-station-by-path": PATHS.searchStationByPath,
    "search-station-by-name": PATHS.searchStationByName,
};

export function SelectSearchTypePage() {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <SelectTypeStep onSelect={(searchTypeId) => navigate(SEARCH_TYPE_PATHS[searchTypeId])} />
        </div>
    );
}
