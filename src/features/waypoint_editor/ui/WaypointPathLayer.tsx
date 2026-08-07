import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useMap } from "react-kakao-maps-sdk";
import {
    type WaypointEditorStatus,
    type WaypointNode,
    type WaypointNodeId,
} from "@/features/waypoint_editor/model/waypointEditor";
import { WaypointMarkers } from "@/features/waypoint_editor/ui/WaypointMarkers";
import type { LatLng } from "@/shared/model/map";

const BASE_LEVEL = 6;
const BASE_STROKE_WEIGHT = 250;
const DEFAULT_RADIUS_KM = 1;

type Props = {
    waypoints: WaypointNode[];
    status: WaypointEditorStatus;
    onWaypointClick: (id: WaypointNodeId) => void;
    onWaypointDelete: (id: WaypointNodeId) => void;
    onWaypointMoveBegin: (id: WaypointNodeId, latLng: LatLng) => void;
    onWaypointMoveUpdate: (id: WaypointNodeId, latLng: LatLng) => void;
    onWaypointMoveCommit: () => void;
};

export function WaypointPathLayer({
    waypoints,
    status,
    onWaypointClick,
    onWaypointDelete,
    onWaypointMoveBegin,
    onWaypointMoveUpdate,
    onWaypointMoveCommit,
}: Props) {
    const map = useMap("WaypointPathLayer");
    const [level, setLevel] = useState(() => map.getLevel());
    const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);

    useEffect(() => {
        const updateLevel = () => {
            setLevel(map.getLevel());
        };

        updateLevel();
        kakao.maps.event.addListener(map, "zoom_changed", updateLevel);

        return () => {
            kakao.maps.event.removeListener(map, "zoom_changed", updateLevel);
        };
    }, [map]);

    const currentStrokeWeight = useMemo(() => calculateStrokeWeight(level, radiusKm), [level, radiusKm]);

    const handleRadiusChange = (event: ChangeEvent<HTMLInputElement>) => {
        setRadiusKm(Number(event.target.value));
    };

    return (
        <>
            <WaypointMarkers
                currentStrokeWeight={currentStrokeWeight}
                waypoints={waypoints}
                status={status}
                onWaypointClick={onWaypointClick}
                onWaypointDelete={onWaypointDelete}
                onWaypointMoveBegin={onWaypointMoveBegin}
                onWaypointMoveUpdate={onWaypointMoveUpdate}
                onWaypointMoveCommit={onWaypointMoveCommit}
            />

            <section className="absolute bottom-4 left-4 z-10 rounded-lg border border-white/10 bg-white px-4 py-3 text-sm text-gray-950 shadow-lg">
                <label htmlFor="radius-range" className="font-bold">
                    경로 반경 <span className="text-gil-blue-500">{formatRadius(radiusKm)} km</span>
                </label>
                <input
                    id="radius-range"
                    type="range"
                    min="1"
                    max="5"
                    step="0.1"
                    value={radiusKm}
                    onChange={handleRadiusChange}
                    className="mt-2 block w-[180px] cursor-pointer"
                />
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                    <span>1km</span>
                    <span>3km</span>
                    <span>5km</span>
                </div>
            </section>
        </>
    );
}

function calculateStrokeWeight(currentLevel: number, radiusKm: number) {
    return BASE_STROKE_WEIGHT * radiusKm * Math.pow(2, BASE_LEVEL - currentLevel);
}

function formatRadius(radiusKm: number) {
    return Number.isInteger(radiusKm) ? String(radiusKm) : radiusKm.toFixed(1);
}
