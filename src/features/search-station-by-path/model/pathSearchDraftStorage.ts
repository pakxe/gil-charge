import {
    DEFAULT_PATH_SEARCH_RADIUS_KM,
    isValidLatLng,
    MAX_PATH_SEARCH_WAYPOINT_COUNT,
    normalizeLatLng,
    normalizeRadiusKm,
    type PathSearchAdjustment,
    type PathSearchCriteria,
} from "@/features/search-station-by-path/model/pathSearchState";
import type { LatLng } from "@/shared/model/map";
import { z } from "zod";

export const PATH_SEARCH_DRAFT_STORAGE_KEY = "gil-charge:search-station-by-path:draft";

export type ReadPathSearchDraftResult = {
    draft: PathSearchCriteria;
    adjustment: PathSearchAdjustment;
    source: "initial" | "storage";
};

const INITIAL_DRAFT: PathSearchCriteria = {
    waypoints: [],
    radiusKm: DEFAULT_PATH_SEARCH_RADIUS_KM,
};

const pathSearchDraftSchema = z.object({
    waypoints: z.array(z.custom<LatLng>(isValidLatLng)),
    radiusKm: z.number(),
});

export function readPathSearchDraft(storage: Storage): ReadPathSearchDraftResult {
    let raw: string | null;

    try {
        raw = storage.getItem(PATH_SEARCH_DRAFT_STORAGE_KEY);
    } catch {
        return initialResult();
    }

    if (raw === null) return initialResult();

    try {
        const value: unknown = JSON.parse(raw);
        const normalized = normalizeDraft(value);
        if (!normalized) throw new Error("Invalid stored draft");

        return {
            draft: normalized.draft,
            adjustment: normalized.adjustment,
            source: "storage",
        };
    } catch {
        return initialResult();
    }
}

export function writePathSearchDraft(storage: Storage, draft: PathSearchCriteria): boolean {
    const normalized = normalizeDraft(draft);
    if (!normalized) return false;

    try {
        storage.setItem(PATH_SEARCH_DRAFT_STORAGE_KEY, JSON.stringify(normalized.draft));
        return true;
    } catch {
        return false;
    }
}

function initialResult(): ReadPathSearchDraftResult {
    return {
        draft: INITIAL_DRAFT,
        adjustment: { waypointCount: false, radius: false },
        source: "initial",
    };
}

function normalizeDraft(value: unknown): { draft: PathSearchCriteria; adjustment: PathSearchAdjustment } | null {
    const parsed = pathSearchDraftSchema.safeParse(value);
    if (!parsed.success) return null;

    const radiusKm = normalizeRadiusKm(parsed.data.radiusKm);
    return {
        draft: {
            waypoints: parsed.data.waypoints.slice(0, MAX_PATH_SEARCH_WAYPOINT_COUNT).map(normalizeLatLng),
            radiusKm,
        },
        adjustment: {
            waypointCount: parsed.data.waypoints.length > MAX_PATH_SEARCH_WAYPOINT_COUNT,
            radius: radiusKm !== parsed.data.radiusKm,
        },
    };
}
