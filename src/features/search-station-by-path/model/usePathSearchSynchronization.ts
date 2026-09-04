import { useEffect } from "react";

import { readPathSearchDraft } from "@/features/search-station-by-path/model/pathSearchDraftStorage";
import {
    type ParsedPathSearchLocation,
    type PathSearchAdjustment,
    type PathSearchCriteria,
    type PathSearchFilter,
} from "@/features/search-station-by-path/model/pathSearchState";
import type { LatLng } from "@/shared/model/map";

const EMPTY_FILTER: PathSearchFilter = { localCurrencyOnly: false, selectedBrandCodes: [] };

type Params = {
    parsed: ParsedPathSearchLocation;
    radiusKm: number;
    restoreWaypoints: (waypoints: LatLng[]) => void;
    setRadiusKm: (radiusKm: number) => void;
    replaceNormalizedSearch: (search: string) => void;
    resetRequest: () => void;
    resetResult: (filter: PathSearchFilter) => void;
    replaceFilter: (filter: PathSearchFilter) => void;
    onInvalidResult: () => void;
    onAdjustment: (adjustment: PathSearchAdjustment) => void;
};

export function usePathSearchSynchronization({
    parsed,
    radiusKm,
    restoreWaypoints,
    setRadiusKm,
    replaceNormalizedSearch,
    resetRequest,
    resetResult,
    replaceFilter,
    onInvalidResult,
    onAdjustment,
}: Params) {
    const effectiveRadiusKm = parsed.mode === "result" ? parsed.criteria.radiusKm : radiusKm;

    const requestKey =
        parsed.mode === "result" && !parsed.needsUrlReplacement
            ? JSON.stringify({ waypoints: parsed.criteria.waypoints, radiusKm: parsed.criteria.radiusKm })
            : null;

    useEffect(() => {
        if (parsed.mode === "invalid-result") {
            const restored = readPathSearchDraft(window.sessionStorage);
            restoreDraft(restored.draft);
            onInvalidResult();
            replaceNormalizedSearch(parsed.normalizedSearch);
            return;
        }

        if (parsed.needsUrlReplacement) {
            if (parsed.mode === "result") {
                onAdjustment(parsed.adjustment);
            }
            replaceNormalizedSearch(parsed.normalizedSearch);
            return;
        }

        if (parsed.mode === "draft") {
            const restored = readPathSearchDraft(window.sessionStorage);
            restoreDraft(restored.draft);
            onAdjustment(restored.adjustment);
            return;
        }

        restoreExternalWaypoints(parsed.criteria.waypoints);

        function restoreDraft(draft: PathSearchCriteria) {
            restoreExternalWaypoints(draft.waypoints);
            setRadiusKm(draft.radiusKm);
        }

        function restoreExternalWaypoints(nextWaypoints: LatLng[]) {
            restoreWaypoints(nextWaypoints);
        }

    }, [onAdjustment, onInvalidResult, parsed, replaceNormalizedSearch, restoreWaypoints, setRadiusKm]);

    useEffect(() => {
        if (requestKey === null) {
            resetRequest();
            resetResult(EMPTY_FILTER);
            return;
        }
        resetResult(EMPTY_FILTER);
    }, [requestKey, resetRequest, resetResult]);

    useEffect(() => {
        if (parsed.mode !== "result" || parsed.needsUrlReplacement) return;
        replaceFilter({
            selectedBrandCodes: parsed.criteria.selectedBrandCodes,
            localCurrencyOnly: parsed.criteria.localCurrencyOnly,
        });
    }, [parsed, replaceFilter]);

    return { effectiveRadiusKm, requestKey };
}
