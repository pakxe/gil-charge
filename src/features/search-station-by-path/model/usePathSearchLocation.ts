import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";

import {
    createDraftSearch,
    createResultSearch,
    parsePathSearchLocation,
    type PathSearchResultCriteria,
} from "@/features/search-station-by-path/model/pathSearchState";

export function usePathSearchLocation() {
    const location = useLocation();
    const navigate = useNavigate();
    const parsed = useMemo(() => parsePathSearchLocation(location.search), [location.search]);

    const replaceSearch = useCallback(
        (next: string | URLSearchParams) => {
            const search = typeof next === "string" ? next : `?${next.toString()}`;
            navigate({ pathname: location.pathname, search }, { replace: true });
        },
        [location.pathname, navigate],
    );

    const replaceWithDraft = useCallback(() => {
        replaceSearch(createDraftSearch(location.search));
    }, [location.search, replaceSearch]);

    const replaceWithResult = useCallback(
        (criteria: PathSearchResultCriteria) => {
            replaceSearch(createResultSearch(location.search, criteria));
        },
        [location.search, replaceSearch],
    );

    return {
        parsed,
        replaceNormalizedSearch: replaceSearch,
        replaceWithDraft,
        replaceWithResult,
    };
}
