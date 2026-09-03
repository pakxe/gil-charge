import type { LatLng } from "@/shared/model/map";
import { clamp, round } from "@/shared/lib/number";
import { z } from "zod";

export const PATH_SEARCH_MODE_PARAM = "mode";
export const PATH_SEARCH_WAYPOINT_PARAM = "wp";
export const PATH_SEARCH_RADIUS_PARAM = "radius";
export const PATH_SEARCH_BRAND_PARAM = "brand";
export const PATH_SEARCH_LOCAL_CURRENCY_PARAM = "localCurrency";

export const DEFAULT_PATH_SEARCH_RADIUS_KM = 1;
export const MIN_PATH_SEARCH_RADIUS_KM = 1;
export const MAX_PATH_SEARCH_RADIUS_KM = 5;
export const PATH_SEARCH_RADIUS_STEP_KM = 0.1;
export const PATH_SEARCH_COORDINATE_PRECISION = 6;
export const MAX_PATH_SEARCH_WAYPOINT_COUNT = 20;

export const PATH_SEARCH_BRAND_CODES = ["SKE", "GSC", "HDO", "SOL", "RTE", "RTX", "NHO", "ETC", "E1G", "SKG"] as const;

export type PathSearchMode = "draft" | "result";

export type PathSearchDraft = {
    waypoints: LatLng[];
    radiusKm: number;
};

export type PathSearchFilter = {
    selectedBrandCodes: string[];
    localCurrencyOnly: boolean;
};

export type PathSearchResultCriteria = PathSearchDraft & PathSearchFilter;

export type PathSearchAdjustment = {
    waypointCount: boolean;
    radius: boolean;
};

export type ParsedPathSearchLocation =
    | {
          mode: "draft";
          search: string;
          changed: boolean;
      }
    | {
          mode: "result";
          criteria: PathSearchResultCriteria;
          adjustment: PathSearchAdjustment;
          search: string;
          changed: boolean;
      }
    | {
          mode: "invalid-result";
          search: string;
      };

const MANAGED_PARAMS = [
    PATH_SEARCH_MODE_PARAM,
    PATH_SEARCH_WAYPOINT_PARAM,
    PATH_SEARCH_RADIUS_PARAM,
    PATH_SEARCH_BRAND_PARAM,
    PATH_SEARCH_LOCAL_CURRENCY_PARAM,
];

const BRAND_CODE_SET = new Set<string>(PATH_SEARCH_BRAND_CODES);
const latLngSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
});
const pathSearchDraftSchema = z.object({
    waypoints: z.array(latLngSchema),
    radiusKm: z.number(),
});

export function parsePathSearchLocation(search: string): ParsedPathSearchLocation {
    const params = new URLSearchParams(search);
    const modeValues = params.getAll(PATH_SEARCH_MODE_PARAM);
    const mode = modeValues[0];

    if (mode !== "result") {
        const normalized = createDraftSearch(params);
        return {
            mode: "draft",
            search: toSearch(normalized),
            changed: mode !== "draft" || modeValues.length !== 1 || toSearch(params) !== toSearch(normalized),
        };
    }

    const waypointValues = params.getAll(PATH_SEARCH_WAYPOINT_PARAM);
    const radiusValue = params.getAll(PATH_SEARCH_RADIUS_PARAM)[0];
    const waypoints = waypointValues.map(parseWaypoint);
    const radiusKm = parseFiniteNumber(radiusValue);

    if (waypoints.length === 0 || waypoints.some((waypoint) => waypoint === null) || radiusKm === null) {
        return {
            mode: "invalid-result",
            search: toSearch(createDraftSearch(params)),
        };
    }

    const normalizedWaypoints = (waypoints as LatLng[]).slice(0, MAX_PATH_SEARCH_WAYPOINT_COUNT);
    const normalizedRadiusKm = normalizeRadiusKm(radiusKm);
    const selectedBrandCodes = normalizeBrandCodes(params.getAll(PATH_SEARCH_BRAND_PARAM));
    const localCurrencyOnly = params.getAll(PATH_SEARCH_LOCAL_CURRENCY_PARAM)[0] === "1";
    const criteria: PathSearchResultCriteria = {
        waypoints: normalizedWaypoints,
        radiusKm: normalizedRadiusKm,
        selectedBrandCodes,
        localCurrencyOnly,
    };
    const normalized = createResultSearch(params, criteria);

    return {
        mode: "result",
        criteria,
        adjustment: {
            waypointCount: waypointValues.length > MAX_PATH_SEARCH_WAYPOINT_COUNT,
            radius: normalizedRadiusKm !== radiusKm,
        },
        search: toSearch(normalized),
        changed: modeValues.length !== 1 || toSearch(params) !== toSearch(normalized),
    };
}

export function createDraftSearch(source: URLSearchParams | string): URLSearchParams {
    const params = cloneParams(source);
    MANAGED_PARAMS.forEach((name) => params.delete(name));
    params.append(PATH_SEARCH_MODE_PARAM, "draft");
    return params;
}

export function createResultSearch(
    source: URLSearchParams | string,
    criteria: PathSearchResultCriteria,
): URLSearchParams {
    const params = cloneParams(source);
    MANAGED_PARAMS.forEach((name) => params.delete(name));
    params.append(PATH_SEARCH_MODE_PARAM, "result");
    criteria.waypoints.forEach((waypoint) => {
        params.append(PATH_SEARCH_WAYPOINT_PARAM, formatWaypoint(normalizeLatLng(waypoint)));
    });
    params.append(PATH_SEARCH_RADIUS_PARAM, formatNumber(normalizeRadiusKm(criteria.radiusKm)));
    normalizeBrandCodes(criteria.selectedBrandCodes).forEach((brandCode) => {
        params.append(PATH_SEARCH_BRAND_PARAM, brandCode);
    });
    params.append(PATH_SEARCH_LOCAL_CURRENCY_PARAM, criteria.localCurrencyOnly ? "1" : "0");
    return params;
}

export function normalizeDraft(value: unknown): { draft: PathSearchDraft; adjustment: PathSearchAdjustment } | null {
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

export function normalizeLatLng(latLng: LatLng): LatLng {
    return {
        lat: round(latLng.lat, PATH_SEARCH_COORDINATE_PRECISION),
        lng: round(latLng.lng, PATH_SEARCH_COORDINATE_PRECISION),
    };
}

export function isValidLatLng(value: unknown): value is LatLng {
    return latLngSchema.safeParse(value).success;
}

export function normalizeRadiusKm(radiusKm: number): number {
    const clamped = clamp(radiusKm, MIN_PATH_SEARCH_RADIUS_KM, MAX_PATH_SEARCH_RADIUS_KM);
    return round(clamped, 1);
}

function parseWaypoint(value: string): LatLng | null {
    const parts = value.split(",");
    if (parts.length !== 2) return null;
    const lat = parseFiniteNumber(parts[0]);
    const lng = parseFiniteNumber(parts[1]);
    if (lat === null || lng === null) return null;
    const parsed = latLngSchema.safeParse({ lat, lng });
    return parsed.success ? normalizeLatLng(parsed.data) : null;
}

function parseFiniteNumber(value: string | undefined): number | null {
    if (value === undefined || value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBrandCodes(values: string[]): string[] {
    const seen = new Set<string>();
    return values.filter((value) => {
        if (!BRAND_CODE_SET.has(value) || seen.has(value)) return false;
        seen.add(value);
        return true;
    });
}

function formatWaypoint(latLng: LatLng): string {
    return `${formatNumber(latLng.lat)},${formatNumber(latLng.lng)}`;
}

function formatNumber(value: number): string {
    return String(Object.is(value, -0) ? 0 : value);
}

function cloneParams(source: URLSearchParams | string): URLSearchParams {
    return new URLSearchParams(typeof source === "string" ? source : source.toString());
}

function toSearch(params: URLSearchParams): string {
    const value = params.toString();
    return value === "" ? "" : `?${value}`;
}
