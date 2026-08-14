import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import type { Station } from "@/shared/types/map";
import { useStationsSearch } from "@/shared/hooks/useStationsSearch";
import { DEFAULT_MAP_CENTER } from "@/shared/constants/map";
import { useMap } from "@/shared/model/useMap";
import { useCurrentLocation } from "@/features/select_search_type/hooks/useCurrentLocation";
import { useWaypointEditor } from "@/features/waypoint_editor/hooks/useWaypointEditor";
import { Map } from "@/shared/ui/Map/Map";
import { WaypointNodesLayer } from "@/features/waypoint_editor/ui/WaypointNodesLayer";
import { WaypointEdgesLayer } from "@/features/waypoint_editor/ui/WaypointEdgesLayer";
import { WaypointLassoLayer } from "@/features/waypoint_editor/ui/WaypointLassoLayer";
import { getWaypointIdsInPolygon } from "@/features/waypoint_editor/utils/getWaypointIdsInPolygon";
import { ResultBottomSheet } from "@/features/select_search_type/components/ResultBottomSheet";
import { StationMarkersLayer } from "@/features/select_search_type/components/StationMarkersLayer";
import Box from "@/shared/components/Box/Box";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner/LoadingSpinner";
import { cn } from "@/shared/utils/cn";
import { WaypointHistoryControls } from "@/features/waypoint_editor/ui/WaypointHistoryControls";
import {
    clamp,
    getResultSheetDefaultHeight,
    getSearchControlsBottom,
} from "@/features/select_search_type/model/resultBottomSheet";
import {
    getStationCenteringDecision,
    getVisibleStations,
    shouldClearSelectedStation,
    stationToLatLng,
    type StationSelectionSource,
} from "@/features/select_search_type/model/stationSelection";

type DrawMode = "waypoint" | "lasso";

interface ModeGuideToastState {
    id: number;
    message: string;
}

export function DrawPathStep() {
    const { status, data, actions } = useWaypointEditor();
    const map = useMap();

    const hasRequestedLocationRef = useRef(false);
    const modeGuideToastIdRef = useRef(0);
    const modeGuideToastTimeoutRef = useRef<number | null>(null);

    const [zoomLevel, setZoomLevel] = useState(8);
    const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
    const [mode, setMode] = useState<DrawMode>(INITIAL_DRAW_MODE);
    const [modeGuideToast, setModeGuideToast] = useState<ModeGuideToastState | null>(null);
    const [stations, setStations] = useState<Station[] | null>(null);
    const [localCurrencyOnly, setLocalCurrencyOnly] = useState(false);
    const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
    const [selectionSource, setSelectionSource] = useState<StationSelectionSource | null>(null);
    const [selectionRevision, setSelectionRevision] = useState(0);

    const { requestLocation, location } = useCurrentLocation();

    const handleStationsFound = (nextStations: Station[]) => {
        setStations(nextStations);
        setSelectedStationId(null);
        setSelectionSource(null);
        setSelectionRevision(0);
    };

    const { fetchStations, isLoading } = useStationsSearch(handleStationsFound);

    const handleRadiusChange = (event: ChangeEvent<HTMLInputElement>) => {
        setRadiusKm(Number(event.target.value));
    };

    const showModeGuideToast = useCallback((nextMode: DrawMode) => {
        const nextToastId = modeGuideToastIdRef.current + 1;

        modeGuideToastIdRef.current = nextToastId;
        setModeGuideToast({
            id: nextToastId,
            message: MODE_GUIDE_MESSAGES[nextMode],
        });

        if (modeGuideToastTimeoutRef.current !== null) {
            window.clearTimeout(modeGuideToastTimeoutRef.current);
        }

        modeGuideToastTimeoutRef.current = window.setTimeout(() => {
            setModeGuideToast(null);
            modeGuideToastTimeoutRef.current = null;
        }, MODE_GUIDE_TOAST_DURATION_MS);
    }, []);

    useEffect(() => {
        showModeGuideToast(INITIAL_DRAW_MODE);
    }, [showModeGuideToast]);

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

    useEffect(() => {
        return () => {
            if (modeGuideToastTimeoutRef.current === null) return;

            window.clearTimeout(modeGuideToastTimeoutRef.current);
        };
    }, []);

    const handleSubmit = async () => {
        if (data.waypoints.length === 0) return;

        await fetchStations(
            [
                {
                    type: "waypoint",
                    points: data.waypoints.map((w) => w.latLng),
                    id: "test",
                },
            ],
            radiusKm,
        );
    };

    const currentStrokeWeight = useMemo(() => calculateStrokeWeight(zoomLevel, radiusKm), [zoomLevel, radiusKm]);
    const visibleStations = useMemo(
        () => (stations ? getVisibleStations(stations, localCurrencyOnly) : []),
        [localCurrencyOnly, stations],
    );
    const hasWaypoint = data.waypoints.length > 0;
    const isLassoMode = mode === "lasso";
    const selectedWaypointIds = status.statusName === "selected" ? status.selectedNodeIds : [];
    const hasSelectedWaypoint = selectedWaypointIds.length > 0;

    const changeSelectedStation = (source: StationSelectionSource, stationId: string, bottomSheetVisibleHeight = 0) => {
        setSelectedStationId(stationId);
        setSelectionSource(source);
        setSelectionRevision((prev) => prev + 1);

        if (source !== "list" || !map) return;

        const station = visibleStations.find((visibleStation) => visibleStation.id === stationId);
        if (!station) return;

        const mapContainer = map.getContainer();
        const containerSize = {
            width: mapContainer.clientWidth,
            height: mapContainer.clientHeight,
        };

        if (containerSize.width <= 0 || containerSize.height <= 0) return;

        const stationPoint = map.latLngToContainerPoint(stationToLatLng(station));
        const centeringDecision = getStationCenteringDecision(stationPoint, containerSize, bottomSheetVisibleHeight);

        if (centeringDecision.shouldCenter) {
            map.setCenter(map.containerPointToLatLng(centeringDecision.nextCenterPoint));
        }
    };

    const handleModeChange = (nextMode: DrawMode) => {
        setMode(nextMode);
        showModeGuideToast(nextMode);
    };

    const handleLocalCurrencyOnlyChange = (nextLocalCurrencyOnly: boolean) => {
        const nextVisibleStations = stations ? getVisibleStations(stations, nextLocalCurrencyOnly) : [];

        setLocalCurrencyOnly(nextLocalCurrencyOnly);

        if (!shouldClearSelectedStation(selectedStationId, nextVisibleStations)) return;

        setSelectedStationId(null);
        setSelectionSource(null);
    };

    // const radiusPathPoints = data.penPaths.length > 0 ? data.penPaths : Array.from(data.waypoints.values());
    return (
        <div className="relative flex min-h-0 flex-1 touch-none flex-col items-center justify-end overflow-hidden bg-gil-gray-900">
            <Map
                loadingFallback={
                    <div className="absolute inset-0 z-50 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-white mt-4 font-bold">지도를 준비중...</p>
                    </div>
                }
                errorFallback={<div>error</div>}
                center={location ?? DEFAULT_MAP_CENTER}
                // currentLocation={location ?? undefined}
                zoomLevel={zoomLevel}
                isDraggable={!isLassoMode && !isMoveActive(status.statusName)}
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
                    onWaypointBatchMoveBegin={actions.beginBatchMove}
                    onWaypointBatchMoveUpdate={actions.updateBatchMove}
                    onWaypointBatchMoveCommit={actions.commitBatchMove}
                />
                <WaypointEdgesLayer waypoints={data.visibleWaypoints} weight={currentStrokeWeight} />
                <WaypointLassoLayer
                    key={mode}
                    enabled={isLassoMode}
                    onComplete={(lassoPath) => {
                        actions.selectWaypoints(getWaypointIdsInPolygon(data.waypoints, lassoPath));
                    }}
                />
                <StationMarkersLayer
                    stations={visibleStations}
                    selectedStationId={selectedStationId}
                    onStationClick={(stationId) => changeSelectedStation("map", stationId)}
                />
            </Map>
            <BottomSearchOverlay
                stations={stations}
                visibleStations={visibleStations}
                radiusKm={radiusKm}
                localCurrencyOnly={localCurrencyOnly}
                selectedStationId={selectedStationId}
                selectionSource={selectionSource}
                selectionRevision={selectionRevision}
                hasWaypoint={hasWaypoint}
                isLoading={isLoading}
                onRadiusChange={handleRadiusChange}
                onLocalCurrencyOnlyChange={handleLocalCurrencyOnlyChange}
                onStationClick={(stationId, bottomSheetVisibleHeight) =>
                    changeSelectedStation("list", stationId, bottomSheetVisibleHeight)
                }
                onSubmit={handleSubmit}
                onClose={() => {
                    setStations(null);
                    setSelectedStationId(null);
                    setSelectionSource(null);
                    setSelectionRevision(0);
                }}
            />
            <ModeGuideToast toast={modeGuideToast} />
            <div className="absolute left-4 top-4 z-60 text-sm font-medium transition-colors flex flex-row gap-2 h-9">
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
                            "h-8 rounded-full px-3 text-xs font-bold transition-colors shrink-0",
                            mode === "waypoint"
                                ? "bg-gil-yellow-400 text-gil-brown-900"
                                : "bg-transparent text-gil-light-text",
                        )}
                        onClick={() => handleModeChange("waypoint")}
                    >
                        추가
                    </button>
                    <button
                        type="button"
                        aria-pressed={mode === "lasso"}
                        className={cn(
                            "h-8 rounded-full px-3 text-xs font-bold transition-colors shrink-0",
                            mode === "lasso"
                                ? "bg-gil-yellow-400 text-gil-brown-900"
                                : "bg-transparent text-gil-light-text",
                        )}
                        onClick={() => handleModeChange("lasso")}
                    >
                        선택
                    </button>
                </Box>
                <button
                    type="button"
                    disabled={!hasSelectedWaypoint}
                    className={cn(
                        "min-h-10 rounded-full bg-[#1f1f1f]/40 px-3 backdrop-blur-[15px] transition-colors text-xs font-bold",
                        hasSelectedWaypoint ? "cursor-pointer text-white" : "cursor-not-allowed text-gil-gray-650",
                    )}
                    onClick={() => {
                        if (!hasSelectedWaypoint) return;

                        actions.deleteBatchWaypoint(selectedWaypointIds);
                    }}
                >
                    선택 삭제
                </button>
                <Box
                    role="button"
                    tabIndex={0}
                    className={cn(
                        hasWaypoint ? "text-white cursor-pointer" : "text-gil-gray-650",
                        "text-xs px-3 font-bold",
                    )}
                    onClick={() => {
                        if (!hasWaypoint) return;
                        actions.deleteAllWaypoint();
                    }}
                >
                    전체 삭제
                </Box>
            </div>
        </div>
    );
}

function ModeGuideToast({ toast }: { toast: ModeGuideToastState | null }) {
    if (!toast) return null;

    return (
        <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute left-1/2 top-16 z-[80] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg bg-gil-gray-950/90 px-4 py-3 text-center text-sub font-bold text-white shadow-lg backdrop-blur-[15px]"
        >
            {toast.message}
        </div>
    );
}

interface BottomSearchOverlayProps {
    stations: Station[] | null;
    visibleStations: Station[];
    radiusKm: number;
    localCurrencyOnly: boolean;
    selectedStationId: string | null;
    selectionSource: StationSelectionSource | null;
    selectionRevision: number;
    hasWaypoint: boolean;
    isLoading: boolean;
    onRadiusChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onLocalCurrencyOnlyChange: (localCurrencyOnly: boolean) => void;
    onStationClick: (stationId: string, bottomSheetVisibleHeight: number) => void;
    onSubmit: () => void;
    onClose: () => void;
}

function BottomSearchOverlay({
    stations,
    visibleStations,
    radiusKm,
    localCurrencyOnly,
    selectedStationId,
    selectionSource,
    selectionRevision,
    hasWaypoint,
    isLoading,
    onRadiusChange,
    onLocalCurrencyOnlyChange,
    onStationClick,
    onSubmit,
    onClose,
}: BottomSearchOverlayProps) {
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const [visibleHeight, setVisibleHeight] = useState(0);
    const [maxSheetHeight, setMaxSheetHeight] = useState(0);

    const hasSearchResult = stations !== null;
    const searchControlsBottom = getSearchControlsBottom(visibleHeight, hasSearchResult);
    const canSubmit = hasWaypoint && !isLoading;

    useEffect(() => {
        if (!hasSearchResult) return;

        const overlay = overlayRef.current;
        if (!overlay) return;

        const updateMaxHeight = () => {
            const nextMaxHeight = getResultSheetMaxHeight(overlay);

            setMaxSheetHeight(nextMaxHeight);
            setVisibleHeight((prev) => clamp(prev, 0, nextMaxHeight));
        };

        const frameId = requestAnimationFrame(() => {
            const nextMaxHeight = getResultSheetMaxHeight(overlay);

            setMaxSheetHeight(nextMaxHeight);
            setVisibleHeight(getResultSheetDefaultHeight(nextMaxHeight));
        });

        const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateMaxHeight);
        observer?.observe(overlay);

        return () => {
            cancelAnimationFrame(frameId);
            observer?.disconnect();
        };
    }, [hasSearchResult, stations]);

    return (
        <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-[70]">
            <div
                className="pointer-events-auto absolute left-0 flex w-full flex-row justify-between gap-4 px-4"
                style={{ bottom: searchControlsBottom }}
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
                            onChange={onRadiusChange}
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
                    type="button"
                    onClick={() => {
                        if (!canSubmit) return;

                        onSubmit();
                    }}
                    disabled={!canSubmit}
                    aria-label={isLoading ? "탐색 중" : "찾기"}
                    className={cn(
                        "flex min-w-20 items-center justify-center rounded-2xl px-6 text-lg font-bold shadow-lg transition-colors",
                        hasWaypoint ? "bg-gil-yellow-400 text-gil-brown-900" : "bg-gil-gray-850 text-gil-gray-600",
                        canSubmit ? "cursor-pointer" : "cursor-not-allowed",
                    )}
                >
                    {isLoading ? <LoadingSpinner /> : "찾기"}
                </button>
            </div>

            {hasSearchResult && (
                <ResultBottomSheet
                    containerRef={overlayRef}
                    maxHeight={maxSheetHeight}
                    stations={stations}
                    visibleStations={visibleStations}
                    localCurrencyOnly={localCurrencyOnly}
                    selectedStationId={selectedStationId}
                    selectionSource={selectionSource}
                    selectionRevision={selectionRevision}
                    visibleHeight={visibleHeight}
                    onVisibleHeightChange={setVisibleHeight}
                    onLocalCurrencyOnlyChange={onLocalCurrencyOnlyChange}
                    onStationClick={(stationId) => onStationClick(stationId, visibleHeight)}
                    onClose={onClose}
                />
            )}
        </div>
    );
}

function formatRadius(radiusKm: number) {
    return Number.isInteger(radiusKm) ? String(radiusKm) : radiusKm.toFixed(1);
}

const BASE_LEVEL = 6;
const BASE_STROKE_WEIGHT = 250;
const DEFAULT_RADIUS_KM = 1;
const INITIAL_DRAW_MODE: DrawMode = "waypoint";
const MODE_GUIDE_TOAST_DURATION_MS = 2500;
const MODE_GUIDE_MESSAGES: Record<DrawMode, string> = {
    waypoint: "화면을 눌러 웨이포인트를 찍을 수 있습니다.",
    lasso: "올가미를 그려 여러 개의 웨이포인트를 선택할 수 있습니다.",
};

function isMoveActive(statusName: string) {
    return statusName === "moving" || statusName === "batchMoving";
}

function calculateStrokeWeight(currentLevel: number, radiusKm: number) {
    return BASE_STROKE_WEIGHT * radiusKm * Math.pow(2, BASE_LEVEL - currentLevel);
}

function getResultSheetMaxHeight(container: HTMLElement | null) {
    return container?.getBoundingClientRect().height ?? window.innerHeight;
}
