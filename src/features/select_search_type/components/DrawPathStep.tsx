import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import type { Station } from "@/shared/types/map";
import { useStationsSearch } from "@/shared/hooks/useStationsSearch";
import { DEFAULT_MAP_CENTER } from "@/shared/constants/map";
import { useCurrentLocation } from "@/features/select_search_type/hooks/useCurrentLocation";
import { useWaypointEditor } from "@/features/waypoint_editor/hooks/useWaypointEditor";
import { Map } from "@/shared/ui/Map/Map";
import { WaypointNodesLayer } from "@/features/waypoint_editor/ui/WaypointNodesLayer";
import { WaypointEdgesLayer } from "@/features/waypoint_editor/ui/WaypointEdgesLayer";
import { WaypointLassoLayer } from "@/features/waypoint_editor/ui/WaypointLassoLayer";
import { getWaypointIdsInPolygon } from "@/features/waypoint_editor/utils/getWaypointIdsInPolygon";
import { ConfirmStep } from "@/features/select_search_type/components/ConfirmStep";
import Box from "@/shared/components/Box/Box";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner/LoadingSpinner";
import { cn } from "@/shared/utils/cn";
import { WaypointHistoryControls } from "@/features/waypoint_editor/ui/WaypointHistoryControls";

interface DrawPathStepProps {
    stations: Station[] | null;
    onNext: (stations: Station[]) => void;
    onResultClear: () => void;
}

type DrawMode = "waypoint" | "lasso";

export function DrawPathStep({ stations, onNext, onResultClear }: DrawPathStepProps) {
    const { status, data, actions } = useWaypointEditor();

    const hasRequestedLocationRef = useRef(false);

    const [zoomLevel, setZoomLevel] = useState(8);
    const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
    const [resultSheetVisibleHeight, setResultSheetVisibleHeight] = useState(0);
    const [mode, setMode] = useState<DrawMode>("waypoint");

    const { requestLocation, location } = useCurrentLocation();

    const handleStationsFound = (nextStations: Station[]) => {
        setResultSheetVisibleHeight(getDefaultResultSheetVisibleHeight());
        onNext(nextStations);
    };

    const { fetchStations, isLoading } = useStationsSearch(handleStationsFound);

    const handleRadiusChange = (event: ChangeEvent<HTMLInputElement>) => {
        setRadiusKm(Number(event.target.value));
    };

    useEffect(() => {
        if (hasRequestedLocationRef.current === true) return;

        requestLocation({
            onSuccess: () => {
                // setIsTracking(true);
            },
            onFinally: () => {
                hasRequestedLocationRef.current = true;
            },
        });
    }, [requestLocation]);

    const handleSubmit = async () => {
        await fetchStations(
            [
                {
                    type: "waypoint",
                    points: data.waypoints.map((w) => w.latLng),
                    id: "test",
                },
            ],
            DEFAULT_RADIUS_KM,
        );
    };

    const currentStrokeWeight = useMemo(() => calculateStrokeWeight(zoomLevel, radiusKm), [zoomLevel, radiusKm]);
    const hasWaypoint = data.waypoints.length > 0;
    const hasSearchResult = stations !== null;
    const controlBottom = hasSearchResult ? resultSheetVisibleHeight : 0;
    const isLassoMode = mode === "lasso";

    // const radiusPathPoints = data.penPaths.length > 0 ? data.penPaths : Array.from(data.waypoints.values());
    return (
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-end overflow-hidden bg-gi-gray-900 touch-none">
            <Map
                loadingFallback={
                    <div className="absolute inset-0 z-50 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-white mt-4 font-bold">영역 안의 주유소를 찾는 중...</p>
                    </div>
                }
                errorFallback={<div>error</div>}
                center={location ?? DEFAULT_MAP_CENTER}
                // currentLocation={location ?? undefined}
                zoomLevel={zoomLevel}
                isDraggable={!isLassoMode && status.statusName !== "moving"}
                isZoomable={!isLassoMode}
                // isTracking={isTracking}
                onZoomLevelChange={(zoomLevel) => setZoomLevel(zoomLevel)}
                onClick={(latLng) => {
                    if (isLassoMode) return;
                    actions.addWaypoint(latLng);
                }}
            >
                <WaypointNodesLayer
                    waypoints={data.visibleWaypoints}
                    status={status}
                    onWaypointClick={actions.selectWaypoint}
                    onWaypointDelete={actions.deleteWaypoint}
                    onWaypointMoveBegin={actions.beginWaypointMove}
                    onWaypointMoveUpdate={actions.updateWaypointMove}
                    onWaypointMoveCommit={actions.commitWaypointMove}
                />
                <WaypointEdgesLayer waypoints={data.visibleWaypoints} weight={currentStrokeWeight} />
                <WaypointLassoLayer
                    key={mode}
                    enabled={isLassoMode}
                    onComplete={(lassoPath) => {
                        actions.selectWaypoints(getWaypointIdsInPolygon(data.waypoints, lassoPath));
                    }}
                />
            </Map>
            {hasSearchResult && (
                <ConfirmStep
                    stations={stations}
                    visibleHeight={resultSheetVisibleHeight}
                    onVisibleHeightChange={setResultSheetVisibleHeight}
                />
            )}

            <div
                className="absolute inset-x-0 z-[60] flex flex-row justify-between w-full px-4 py-10 gap-4"
                style={{ bottom: controlBottom }}
            >
                <Box className="h-fit min-w-0 flex-1 flex flex-col rounded-2xl gap-0">
                    <div className="flex flex-row justify-between w-full">
                        <label htmlFor="radius-range" className=" text-white text-xs">
                            반경
                        </label>
                        <span className="font-bold text-gil-yellow-400 text-xs">{formatRadius(radiusKm)} km</span>
                    </div>

                    <div className="w-full">
                        <input
                            id="radius-range"
                            type="range"
                            min="1"
                            max="5"
                            step="0.1"
                            value={radiusKm}
                            onChange={handleRadiusChange}
                            className="mt-2 block h-4.5 w-full cursor-pointer appearance-none rounded-full bg-transparent bg-center bg-no-repeat focus:outline-none focus-visible:ring-2 focus-visible:ring-gil-yellow-400/70 [&::-moz-range-progress]:h-[6px] [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-gil-yellow-400 [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-gil-yellow-400 [&::-moz-range-thumb]:shadow-[inset_0_0_0_2px_#fff] [&::-moz-range-track]:h-[6px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-black [&::-webkit-slider-runnable-track]:h-[6px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-[6px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gil-yellow-400 [&::-webkit-slider-thumb]:shadow-[inset_0_0_0_2px_#fff]"
                            style={{
                                backgroundImage: `linear-gradient(to right, #f0c243 0%, #f0c243 ${((radiusKm - 1) / 4) * 100}%, #000 ${((radiusKm - 1) / 4) * 100}%, #000 100%)`,
                                backgroundSize: "100% 6px",
                                backgroundClip: "content-box",
                            }}
                        />
                    </div>
                </Box>
                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    aria-label={isLoading ? "탐색 중" : "찾기"}
                    className={cn(
                        "flex items-center justify-center font-bold rounded-2xl transition-colors text-lg shadow-lg pointer-events-auto px-6 min-w-20",
                        hasWaypoint ? "bg-gil-yellow-400 text-gil-brown-900" : "bg-gil-gray-850 text-gil-gray-600",
                    )}
                >
                    {isLoading ? <LoadingSpinner /> : "찾기"}
                </button>
            </div>
            <div className="absolute left-4 top-4 z-[60] text-sm font-medium transition-colors flex flex-row gap-3">
                <WaypointHistoryControls
                    canUndo={data.canUndo}
                    canRedo={data.canRedo}
                    onUndo={actions.undoWaypoint}
                    onRedo={actions.redoWaypoint}
                />
                <Box role="group" aria-label="경로 편집 모드" yPad={4} xPad={4} className="gap-1">
                    <button
                        type="button"
                        aria-pressed={mode === "waypoint"}
                        className={cn(
                            "h-8 rounded-full px-3 text-xs font-bold transition-colors",
                            mode === "waypoint"
                                ? "bg-gil-yellow-400 text-gil-brown-900"
                                : "bg-transparent text-gil-light-text",
                        )}
                        onClick={() => setMode("waypoint")}
                    >
                        추가
                    </button>
                    <button
                        type="button"
                        aria-pressed={mode === "lasso"}
                        className={cn(
                            "h-8 rounded-full px-3 text-xs font-bold transition-colors",
                            mode === "lasso"
                                ? "bg-gil-yellow-400 text-gil-brown-900"
                                : "bg-transparent text-gil-light-text",
                        )}
                        onClick={() => setMode("lasso")}
                    >
                        선택
                    </button>
                </Box>
                <Box
                    role="button"
                    tabIndex={0}
                    className={cn(hasWaypoint ? "text-gil-yellow-400 cursor-pointer" : "text-black")}
                    onClick={() => {
                        if (!hasWaypoint) return;
                        actions.deleteAllWaypoint();
                        setResultSheetVisibleHeight(0);
                        onResultClear();
                    }}
                >
                    전체 삭제
                </Box>
            </div>
        </div>
    );
}

function formatRadius(radiusKm: number) {
    return Number.isInteger(radiusKm) ? String(radiusKm) : radiusKm.toFixed(1);
}

const BASE_LEVEL = 6;
const BASE_STROKE_WEIGHT = 250;
const DEFAULT_RADIUS_KM = 1;
const DEFAULT_RESULT_SHEET_HEIGHT_RATIO = 0.5;

function calculateStrokeWeight(currentLevel: number, radiusKm: number) {
    return BASE_STROKE_WEIGHT * radiusKm * Math.pow(2, BASE_LEVEL - currentLevel);
}

function getDefaultResultSheetVisibleHeight() {
    return window.innerHeight * DEFAULT_RESULT_SHEET_HEIGHT_RATIO;
}
