import { useEffect, useRef, useState } from "react";
import { ToolButton } from "./ToolButton";

import { Station } from "@/shared/types/map";
import { useStationsSearch } from "@/shared/hooks/useStationsSearch";
import { DEFAULT_MAP_CENTER } from "@/shared/constants/map";
import { useCurrentLocation } from "@/features/select_search_type/hooks/useCurrentLocation";
import { KakaoMap } from "@/features/select_search_type/components/KakaoMap";
import { useEditArea } from "@/shared/hooks/useEditArea";
import { KakaoPoints } from "@/features/select_search_type/components/LatLngPathPoints";
import { KakaoWaypoints } from "@/features/select_search_type/components/WaypointMarkers";
import { KakaoProjectedRadiusPath } from "@/features/select_search_type/components/RadiusPath";

const DEFAULT_RADIUS_KM = 5.0;
const MIN_RADIUS_KM = 0.1;
const MAX_RADIUS_KM = 5.0;
const RADIUS_STEP_KM = 0.1;

interface DrawPathStepProps {
    onNext: (stations: Station[]) => void;
}

export function DrawPathStep({ onNext }: DrawPathStepProps) {
    // const drawing = useMapDrawing();
    const { state, data, getSubmitValue, actions, canRedo, canUndo } = useEditArea();
    const { fetchStations, isLoading } = useStationsSearch(onNext);

    const hasRequestedLocationRef = useRef(false);

    const [zoomLevel, setZoomLevel] = useState(8);
    const [radiusKm, setRadiusKm] = useState(1.0);

    const { requestLocation, location, locationAcceptStatus } = useCurrentLocation();

    const [isTracking, setIsTracking] = useState(false);

    useEffect(() => {
        if (hasRequestedLocationRef.current === true) return;

        requestLocation({
            onSuccess: () => {
                setIsTracking(true);
            },
            onFinally: () => {
                hasRequestedLocationRef.current = true;
            },
        });
    }, [requestLocation]);

    const handleSubmit = async () => {
        const payload = getSubmitValue();

        await fetchStations(payload, radiusKm);
    };

    const radiusPathPoints = data.penPaths.length > 0 ? data.penPaths : Array.from(data.waypoints.values());
    return (
        <div className="relative w-full h-150 bg-gi-gray-900 rounded-lg overflow-hidden flex flex-col items-center justify-end touch-none">
            {isLoading && (
                <div className="absolute inset-0 z-50 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-white mt-4 font-bold">영역 안의 주유소를 찾는 중...</p>
                </div>
            )}

            <KakaoMap
                center={location ?? DEFAULT_MAP_CENTER}
                isGeneralDraggable={true}
                currentLocation={location ?? undefined}
                zoomLevel={zoomLevel}
                isTracking={isTracking}
                onZoomLevelChange={(zoomLevel) => setZoomLevel(zoomLevel)}
                onClick={(latLng) => {
                    setIsTracking(false);
                    actions.onMapClick(latLng);
                }}
                onDragStart={(latLng) => {
                    setIsTracking(false);
                    actions.onMapDragStart(latLng);
                }}
                onDragMove={(latLng) => {
                    actions.onMapDragMove(latLng);
                }}
                onDragEnd={() => {
                    if (state.mode !== "pen") return;

                    actions.onMapDragEnd();
                }}
            >
                <KakaoProjectedRadiusPath points={radiusPathPoints} radiusKm={radiusKm} />

                {state.mode === "pen" && (
                    <KakaoPoints
                        points={data.penPaths.length > 0 ? data.penPaths : Array.from(data.waypoints.values())}
                    />
                )}
                {state.mode === "waypoint" && (
                    <KakaoWaypoints
                        isDraggable={true}
                        waypoints={data.waypoints}
                        selectedIndex={state.selectedWaypointIndex}
                        onWaypointDragStart={(index, latLng) => actions.onWaypointDragStart(index, latLng)}
                        onWaypointDragMove={(index, latLng) => actions.onWaypointDragMove(index, latLng)}
                        onWaypointDragEnd={() => actions.onWaypointDragEnd()}
                        onWaypointClick={(index) => actions.onWaypointClick(index)}
                        onWaypointDelete={(index) => actions.deleteWaypoint(index)}
                    />
                )}
            </KakaoMap>

            <button
                className="absolute top-4 left-4 z-30 flex items-center gap-1.5 rounded-full bg-gray-900/85 px-3 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-sm border border-white/10 disabled:opacity-60"
                onClick={() => actions.undo()}
                disabled={!canUndo}
            >
                ⬅️
            </button>
            <button
                className="absolute top-4 left-16 z-30 flex items-center gap-1.5 rounded-full bg-gray-900/85 px-3 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-sm border border-white/10 disabled:opacity-60"
                onClick={() => actions.redo()}
                disabled={!canRedo}
            >
                ➡️
            </button>

            <button
                type="button"
                onClick={() => setIsTracking(true)}
                disabled={
                    locationAcceptStatus === "loading" ||
                    locationAcceptStatus === "unavailable" ||
                    locationAcceptStatus === "denied" ||
                    locationAcceptStatus === "error"
                }
                aria-label="내 위치로 돌아가기"
                title="내 위치로 돌아가기"
                className="absolute top-4 right-4 z-30 flex items-center gap-1.5 rounded-full bg-gray-900/85 px-3 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-sm border border-white/10 disabled:opacity-60"
            >
                <span>{locationAcceptStatus === "loading" ? "…" : isTracking ? "따라가는중" : "안따라가는중"}</span>
                <span>내 위치</span>
            </button>
            {/* 

            {locationStatus === "denied" && (
                <div className="absolute top-16 left-4 right-4 z-30 rounded-xl bg-gray-900/85 px-4 py-3 text-sm text-white shadow-lg backdrop-blur-sm">
                    위치 권한이 거부되어 현재 위치로 이동할 수 없습니다.
                </div>
            )}

            {locationStatus === "unavailable" && (
                <div className="absolute top-16 left-4 right-4 z-30 rounded-xl bg-gray-900/85 px-4 py-3 text-sm text-white shadow-lg backdrop-blur-sm">
                    이 브라우저에서는 현재 위치를 사용할 수 없습니다.
                </div>
            )}

            {locationStatus === "error" && (
                <div className="absolute top-16 left-4 right-4 z-30 rounded-xl bg-gray-900/85 px-4 py-3 text-sm text-white shadow-lg backdrop-blur-sm">
                    현재 위치를 가져오지 못했습니다. 다시 시도해주세요.
                </div>
            )} */}

            <div className="z-20 w-full px-6 pb-6 flex flex-col gap-6 pointer-events-none">
                <div className="flex items-center justify-between w-full pointer-events-auto">
                    <div className="flex flex-col gap-1 w-2/3 max-w-50 bg-gray-900/80 p-3 rounded-2xl backdrop-blur-sm shadow-lg">
                        <span className="text-white text-sm font-bold ml-1">{radiusKm.toFixed(1)}km</span>
                        <input
                            type="range"
                            min={MIN_RADIUS_KM}
                            max={MAX_RADIUS_KM}
                            step={RADIUS_STEP_KM}
                            value={radiusKm}
                            onChange={(e) => setRadiusKm(Number(e.target.value))}
                            className="w-full accent-yellow-500"
                        />
                    </div>

                    <div className="flex gap-2 bg-gray-900/80 p-2 rounded-full backdrop-blur-sm shadow-lg">
                        {/* <ToolButton
                            isActive={state.mode === "pen"}
                            icon="✏️"
                            onClick={() => {
                                setIsTracking(false);
                                actions.selectMode("pen");
                            }}
                        /> */}
                        <ToolButton
                            isActive={state.mode === "waypoint"}
                            icon="📍"
                            onClick={() => {
                                setIsTracking(false);
                                actions.selectMode("waypoint");
                            }}
                        />
                        {/* <ToolButton
                            isActive={drawing.tool === "eraser"}
                            icon="🧽"
                            onClick={() => {
                                setIsTracking(false);
                                drawing.handleChangeTool("eraser");
                            }}
                        /> */}
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-500 text-black font-bold rounded-full transition-colors text-lg shadow-lg pointer-events-auto"
                >
                    {isLoading ? "탐색 중..." : "이 영역에서 찾기"}
                </button>
            </div>
        </div>
    );
}
