import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useMap } from "react-kakao-maps-sdk";
import type { WaypointNode } from "@/features/waypoint_editor/model/waypointEditor";
import { MAP_Z_INDEX } from "@/shared/constants/map";
import { Map } from "@/shared/ui/Map/Map";
import Box from "@/shared/components/Box/Box";

const BASE_LEVEL = 6;
const BASE_STROKE_WEIGHT = 250;
const DEFAULT_RADIUS_KM = 1;

type Props = {
    waypoints: WaypointNode[];
};

export function WaypointEdgesLayer({ waypoints }: Props) {
    const map = useMap("WaypointEdgesLayer");
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

    const path = useMemo(() => waypoints.map((waypoint) => waypoint.latLng), [waypoints]);
    const currentStrokeWeight = useMemo(() => calculateStrokeWeight(level, radiusKm), [level, radiusKm]);

    const handleRadiusChange = (event: ChangeEvent<HTMLInputElement>) => {
        setRadiusKm(Number(event.target.value));
    };

    return (
        <>
            <Map.Polyline
                path={path}
                strokeWeight={6}
                strokeColor={"#DEA60C"}
                strokeOpacity={1}
                strokeStyle={"solid"}
                zIndex={MAP_Z_INDEX.waypoint - 1}
            />
            <Map.Polyline
                path={path}
                strokeWeight={currentStrokeWeight}
                strokeColor={"#f0c243"}
                strokeOpacity={0.4}
                strokeStyle={"solid"}
                zIndex={MAP_Z_INDEX.waypoint - 1}
            />

            <Box className="absolute bottom-4 left-4 z-10 h-fit flex flex-col rounded-2xl gap-0">
                <div className="flex flex-row justify-between w-full">
                    <label htmlFor="radius-range" className=" text-white text-xs">
                        반경
                    </label>
                    <span className="font-bold text-gil-yellow-400 text-xs">{formatRadius(radiusKm)} km</span>
                </div>

                <div>
                    <input
                        id="radius-range"
                        type="range"
                        min="1"
                        max="5"
                        step="0.1"
                        value={radiusKm}
                        onChange={handleRadiusChange}
                        className="mt-2 block h-[18px] w-[180px] cursor-pointer appearance-none rounded-full bg-transparent bg-center bg-no-repeat focus:outline-none focus-visible:ring-2 focus-visible:ring-gil-yellow-400/70 [&::-moz-range-progress]:h-[6px] [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-gil-yellow-400 [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-gil-yellow-400 [&::-moz-range-thumb]:shadow-[inset_0_0_0_2px_#fff] [&::-moz-range-track]:h-[6px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-black [&::-webkit-slider-runnable-track]:h-[6px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-[6px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gil-yellow-400 [&::-webkit-slider-thumb]:shadow-[inset_0_0_0_2px_#fff]"
                        style={{
                            backgroundImage: `linear-gradient(to right, #f0c243 0%, #f0c243 ${((radiusKm - 1) / 4) * 100}%, #000 ${((radiusKm - 1) / 4) * 100}%, #000 100%)`,
                            backgroundSize: "100% 6px",
                            backgroundClip: "content-box",
                        }}
                    />
                </div>
            </Box>
        </>
    );
}

function calculateStrokeWeight(currentLevel: number, radiusKm: number) {
    return BASE_STROKE_WEIGHT * radiusKm * Math.pow(2, BASE_LEVEL - currentLevel);
}

function formatRadius(radiusKm: number) {
    return Number.isInteger(radiusKm) ? String(radiusKm) : radiusKm.toFixed(1);
}
