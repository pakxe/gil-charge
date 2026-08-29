import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { point, polygon } from "@turf/helpers";
import type { LatLng } from "@/shared/model/map";

export function pointInPolygon(latLng: LatLng, polygonPath: LatLng[]): boolean {
    const openRing = removeClosingPoint(polygonPath);

    if (openRing.length < 3) {
        return false;
    }

    return booleanPointInPolygon(point(toPosition(latLng)), polygon([closeRing(openRing).map(toPosition)]), {
        ignoreBoundary: false,
    });
}

function removeClosingPoint(path: LatLng[]): LatLng[] {
    const first = path[0];
    const last = path[path.length - 1];

    if (!first || !last || !isSameLatLng(first, last)) {
        return path;
    }

    return path.slice(0, -1);
}

function closeRing(path: LatLng[]): LatLng[] {
    const first = path[0];

    if (!first) {
        return path;
    }

    return [...path, first];
}

function isSameLatLng(a: LatLng, b: LatLng): boolean {
    return a.lat === b.lat && a.lng === b.lng;
}

function toPosition(latLng: LatLng): [number, number] {
    return [latLng.lng, latLng.lat];
}
