import type { LatLng } from "@/shared/model/map";

export type CurrentLocationStatus =
    | "idle"
    | "locating"
    | "tracking"
    | "stale"
    | "unavailable"
    | "blocked"
    | "paused";

export type CurrentLocationEvent =
    | { type: "request" }
    | { type: "success" }
    | { type: "permissionDenied" }
    | { type: "initialFailure" }
    | { type: "trackingFailure" }
    | { type: "pause" }
    | { type: "resume" }
    | { type: "unavailable" };

export type LocationRenderSnapshot = {
    lastRenderedLocation: LatLng | null;
    lastRenderedAt: number;
};

export const MIN_LOCATION_UPDATE_INTERVAL_MS = 2_000;
export const MIN_LOCATION_UPDATE_DISTANCE_METERS = 5;

export function getNextCurrentLocationStatus(
    status: CurrentLocationStatus,
    event: CurrentLocationEvent,
): CurrentLocationStatus {
    switch (event.type) {
        case "request":
            return status === "tracking" || status === "stale" ? "tracking" : "locating";
        case "success":
            return "tracking";
        case "permissionDenied":
            return "blocked";
        case "initialFailure":
            return "idle";
        case "trackingFailure":
            return "stale";
        case "pause":
            return "paused";
        case "resume":
            return status === "paused" ? "tracking" : status;
        case "unavailable":
            return "unavailable";
    }
}

export function shouldRenderLocationUpdate(
    snapshot: LocationRenderSnapshot,
    nextLocation: LatLng,
    now: number,
    minIntervalMs = MIN_LOCATION_UPDATE_INTERVAL_MS,
    minDistanceMeters = MIN_LOCATION_UPDATE_DISTANCE_METERS,
) {
    if (!snapshot.lastRenderedLocation) {
        return true;
    }

    return (
        now - snapshot.lastRenderedAt >= minIntervalMs &&
        getDistanceMeters(snapshot.lastRenderedLocation, nextLocation) >= minDistanceMeters
    );
}

export function getDistanceMeters(from: LatLng, to: LatLng) {
    const earthRadiusMeters = 6_371_000;
    const fromLat = toRadians(from.lat);
    const toLat = toRadians(to.lat);
    const deltaLat = toRadians(to.lat - from.lat);
    const deltaLng = toRadians(to.lng - from.lng);

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusMeters * c;
}

function toRadians(degrees: number) {
    return (degrees * Math.PI) / 180;
}
