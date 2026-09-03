import {
    DEFAULT_PATH_SEARCH_RADIUS_KM,
    normalizeDraft,
    type PathSearchAdjustment,
    type PathSearchDraft,
} from "@/features/search-station-by-path/model/pathSearchState";

export const PATH_SEARCH_DRAFT_STORAGE_KEY = "gil-charge:search-station-by-path:draft";

export type ReadPathSearchDraftResult = {
    draft: PathSearchDraft;
    adjustment: PathSearchAdjustment;
    source: "initial" | "storage";
};

const INITIAL_DRAFT: PathSearchDraft = {
    waypoints: [],
    radiusKm: DEFAULT_PATH_SEARCH_RADIUS_KM,
};

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

        const result: ReadPathSearchDraftResult = {
            draft: normalized.draft,
            adjustment: normalized.adjustment,
            source: "storage",
        };

        if (JSON.stringify(normalized.draft) !== raw) {
            writePathSearchDraft(storage, normalized.draft);
        }

        return result;
    } catch {
        try {
            storage.removeItem(PATH_SEARCH_DRAFT_STORAGE_KEY);
        } catch {
            // Storage may be unavailable; the in-memory initial state is still usable.
        }
        return initialResult();
    }
}

export function writePathSearchDraft(storage: Storage, draft: PathSearchDraft): boolean {
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
