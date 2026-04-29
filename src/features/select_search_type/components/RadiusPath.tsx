import { LatLng } from "@/shared/types/map";
import { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-kakao-maps-sdk";

interface KakaoProjectedRadiusPathProps {
    points: LatLng[];
    radiusKm: number;
}

export function KakaoProjectedRadiusPath({ points, radiusKm }: KakaoProjectedRadiusPathProps) {
    const map = useMap("KakaoProjectedRadiusPath");

    const polylineRef = useRef<kakao.maps.Polyline | null>(null);

    const path = useMemo(() => {
        return points.map(toKakaoLatLng);
    }, [points]);

    useEffect(() => {
        if (!map || path.length < 2) {
            polylineRef.current?.setMap(null);
            polylineRef.current = null;
            return;
        }

        const radiusMeters = radiusKm * 1000;

        const updatePolyline = () => {
            if (!map || path.length < 2) return;

            // 경로가 길면 전체 경로 중간쯤의 위도 기준으로 px 변환
            const centerPoint = points[Math.floor(points.length / 2)];

            const projectedRadiusPx = getProjectedRadiusPx(map, centerPoint!, radiusMeters);

            const strokeWeight = Math.max(1, Math.round(projectedRadiusPx * 2));

            if (!polylineRef.current) {
                polylineRef.current = new kakao.maps.Polyline({
                    map,
                    path,
                    strokeWeight,
                    strokeColor: "#FACC15",
                    strokeOpacity: 0.25,
                    strokeStyle: "solid",
                    zIndex: 1,
                });
            } else {
                polylineRef.current.setPath(path);
                polylineRef.current.setOptions({
                    strokeWeight,
                });
                polylineRef.current.setMap(map);
            }
        };

        updatePolyline();

        kakao.maps.event.addListener(map, "zoom_changed", updatePolyline);
        kakao.maps.event.addListener(map, "idle", updatePolyline);

        return () => {
            kakao.maps.event.removeListener(map, "zoom_changed", updatePolyline);
            kakao.maps.event.removeListener(map, "idle", updatePolyline);

            polylineRef.current?.setMap(null);
            polylineRef.current = null;
        };
    }, [map, path, points, radiusKm]);

    return null;
}

type LatLngLike = {
    lat: number;
    lng: number;
};

const EARTH_RADIUS_M = 6378137;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function destinationPoint(origin: LatLngLike, distanceMeters: number, bearingDegrees: number): LatLngLike {
    const bearing = bearingDegrees * DEG_TO_RAD;
    const lat1 = origin.lat * DEG_TO_RAD;
    const lng1 = origin.lng * DEG_TO_RAD;
    const angularDistance = distanceMeters / EARTH_RADIUS_M;

    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
    );

    const lng2 =
        lng1 +
        Math.atan2(
            Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
            Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
        );

    return {
        lat: lat2 * RAD_TO_DEG,
        lng: ((lng2 * RAD_TO_DEG + 540) % 360) - 180,
    };
}

function toKakaoLatLng(point: LatLngLike) {
    return new kakao.maps.LatLng(point.lat, point.lng);
}

function getProjectedRadiusPx(map: kakao.maps.Map, center: LatLng, radiusMeters: number) {
    const projection = map.getProjection();

    const centerPoint = projection.containerPointFromCoords(toKakaoLatLng(center));

    // 같은 중심에서 동쪽으로 radiusMeters 떨어진 실제 지점
    const eastPointLatLng = destinationPoint(center, radiusMeters, 90);
    const eastPoint = projection.containerPointFromCoords(toKakaoLatLng(eastPointLatLng));

    return Math.hypot(eastPoint.x - centerPoint.x, eastPoint.y - centerPoint.y);
}
