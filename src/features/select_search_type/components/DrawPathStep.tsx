import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { type StationsSearchFailurePolicy, useStationsSearch } from "@/shared/hooks/useStationsSearch";
import { DEFAULT_MAP_CENTER } from "@/shared/constants/map";
import { useMap } from "@/shared/model/useMap";
import { useCurrentLocation } from "@/features/select_search_type/hooks/useCurrentLocation";
import { useSearchResultSheetLayout } from "@/features/select_search_type/hooks/useSearchResultSheetLayout";
import { useWaypointEditor } from "@/features/waypoint_editor/hooks/useWaypointEditor";
import { Map } from "@/shared/ui/Map/Map";
import { MapErrorFallback, MapLoadingFallback } from "@/shared/ui/Map/MapFallback";
import { WaypointNodesLayer } from "@/features/waypoint_editor/ui/WaypointNodesLayer";
import { WaypointEdgesLayer } from "@/features/waypoint_editor/ui/WaypointEdgesLayer";
import { WaypointLassoLayer } from "@/features/waypoint_editor/ui/WaypointLassoLayer";
import { getWaypointIdsInPolygon } from "@/features/waypoint_editor/utils/getWaypointIdsInPolygon";
import { ResultBottomSheet } from "@/features/select_search_type/components/ResultBottomSheet";
import { StationMarkersLayer } from "@/features/select_search_type/components/StationMarkersLayer";
import type { RequestFailure } from "@/shared/lib/requestFailure";
import { useToast } from "@/shared/ui/Toast/useToast";
import Box from "@/shared/components/Box/Box";
import { InlineFailurePresentation } from "@/shared/components/InlineFailurePresentation/InlineFailurePresentation";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner/LoadingSpinner";
import { Slider } from "@/shared/components/Slider/Slider";
import { cn } from "@/shared/utils/cn";
import { WaypointHistoryControls } from "@/features/waypoint_editor/ui/WaypointHistoryControls";
import {
    getStationCenteringDecision,
    getVisibleStations,
    shouldClearSelectedStation,
    stationToLatLng,
    type StationSelectionSource,
} from "@/features/select_search_type/model/stationSelection";

type DrawMode = "waypoint" | "lasso";

export function DrawPathStep() {
    const { status, data, actions } = useWaypointEditor();
    const map = useMap();

    const hasRequestedLocationRef = useRef(false);

    const [zoomLevel, setZoomLevel] = useState(8);
    const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
    const [mode, setMode] = useState<DrawMode>(INITIAL_DRAW_MODE);
    const [isSearchResultDismissed, setIsSearchResultDismissed] = useState(false);
    const [localCurrencyOnly, setLocalCurrencyOnly] = useState(false);
    const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
    const [selectionSource, setSelectionSource] = useState<StationSelectionSource | null>(null);
    const [selectionRevision, setSelectionRevision] = useState(0);

    const { requestLocation, location } = useCurrentLocation();
    const { state: stationsSearchState, retry: retryStationsSearch, search: searchStations } = useStationsSearch();
    const { showToast } = useToast();

    const stations = isSearchResultDismissed ? null : stationsSearchState.stations;
    const isLoading = stationsSearchState.status === "loading";
    const searchFailure = stationsSearchState.status === "error" ? stationsSearchState.failure : null;
    const searchFailurePolicy = stationsSearchState.status === "error" ? stationsSearchState.policy : null;

    const handleRadiusChange = (event: ChangeEvent<HTMLInputElement>) => {
        setRadiusKm(Number(event.target.value));
    };

    useEffect(() => {
        showToast({
            message: MODE_GUIDE_MESSAGES[INITIAL_DRAW_MODE],
            durationMs: MODE_GUIDE_TOAST_DURATION_MS,
        });
    }, [showToast]);

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
        if (!searchFailure || !searchFailurePolicy) return;

        if (searchFailurePolicy.report === "always") {
            console.error("주유소 검색 실패:", searchFailure);
        }

        const toast = getStationsSearchFailureToast(searchFailure, searchFailurePolicy, retryStationsSearch);

        if (!toast) return;

        showToast(toast);
    }, [retryStationsSearch, searchFailure, searchFailurePolicy, showToast]);

    const handleSubmit = async () => {
        if (data.waypoints.length === 0) return;

        setIsSearchResultDismissed(false);
        setSelectedStationId(null);
        setSelectionSource(null);
        setSelectionRevision(0);
        await searchStations(
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
    const hasSearchResult = stations !== null;
    const canSubmitSearch = hasWaypoint && !isLoading;
    const {
        searchOverlayRef,
        searchOverlayVisibleHeight,
        maxSearchSheetHeight,
        searchControlsBottom,
        setSearchOverlayVisibleHeight,
    } = useSearchResultSheetLayout({ hasSearchResult, stations });

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
        showToast({
            message: MODE_GUIDE_MESSAGES[nextMode],
            durationMs: MODE_GUIDE_TOAST_DURATION_MS,
        });
    };

    const handleLocalCurrencyOnlyChange = (nextLocalCurrencyOnly: boolean) => {
        const nextVisibleStations = stations ? getVisibleStations(stations, nextLocalCurrencyOnly) : [];

        setLocalCurrencyOnly(nextLocalCurrencyOnly);

        if (!shouldClearSelectedStation(selectedStationId, nextVisibleStations)) return;

        setSelectedStationId(null);
        setSelectionSource(null);
    };

    return (
        <div
            className="relative flex min-h-0 flex-1 touch-none flex-col items-center justify-end overflow-hidden bg-gil-gray-900"
            data-map-surface="waypoint-search"
        >
            <Map
                loadingFallback={<MapLoadingFallback />}
                errorFallback={
                    <MapErrorFallback
                        message="지도를 불러오지 못했습니다."
                        description="네트워크 상태를 확인한 뒤 다시 시도해주세요."
                        onRetry={reloadPage}
                    />
                }
                center={location ?? DEFAULT_MAP_CENTER}
                zoomLevel={zoomLevel}
                isDraggable={!isLassoMode && !isMoveActive(status.statusName)}
                isZoomable={!isLassoMode}
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
            <div ref={searchOverlayRef} className="pointer-events-none absolute inset-0 z-70">
                <div
                    className="pointer-events-auto absolute left-0 flex w-full flex-row justify-between gap-4 px-4"
                    style={{ bottom: searchControlsBottom }}
                >
                    <Box className="h-fit min-w-0 flex-1 flex flex-col rounded-2xl gap-0">
                        <Slider
                            id="radius-range"
                            min={1}
                            max={5}
                            step={0.1}
                            value={radiusKm}
                            onChange={handleRadiusChange}
                            topSlot={
                                <>
                                    <label htmlFor="radius-range" className="text-white text-xs">
                                        반경
                                    </label>
                                    <span className="font-bold text-gil-yellow-400 text-xs">
                                        {formatRadius(radiusKm)} km
                                    </span>
                                </>
                            }
                            bottomSlot={
                                <InlineFailurePresentation
                                    message={
                                        searchFailure && searchFailurePolicy?.presentation === "inline"
                                            ? getStationsSearchFailureMessage(searchFailure)
                                            : null
                                    }
                                />
                            }
                        />
                    </Box>
                    <button
                        type="button"
                        onClick={() => {
                            if (!canSubmitSearch) return;

                            void handleSubmit();
                        }}
                        disabled={!canSubmitSearch}
                        aria-label={isLoading ? "탐색 중" : "찾기"}
                        className={cn(
                            "flex min-w-20 items-center justify-center rounded-2xl px-6 text-lg font-bold shadow-lg transition-colors",
                            hasWaypoint ? "bg-gil-yellow-400 text-gil-brown-900" : "bg-gil-gray-850 text-gil-gray-600",
                            canSubmitSearch ? "cursor-pointer" : "cursor-not-allowed",
                        )}
                    >
                        {isLoading ? <LoadingSpinner /> : "찾기"}
                    </button>
                </div>

                {hasSearchResult && (
                    <ResultBottomSheet
                        containerRef={searchOverlayRef}
                        maxHeight={maxSearchSheetHeight}
                        stations={stations}
                        visibleStations={visibleStations}
                        localCurrencyOnly={localCurrencyOnly}
                        selectedStationId={selectedStationId}
                        selectionSource={selectionSource}
                        selectionRevision={selectionRevision}
                        visibleHeight={searchOverlayVisibleHeight}
                        onVisibleHeightChange={setSearchOverlayVisibleHeight}
                        onLocalCurrencyOnlyChange={handleLocalCurrencyOnlyChange}
                        onStationClick={(stationId) =>
                            changeSelectedStation("list", stationId, searchOverlayVisibleHeight)
                        }
                        onClose={() => {
                            setIsSearchResultDismissed(true);
                            setSelectedStationId(null);
                            setSelectionSource(null);
                            setSelectionRevision(0);
                        }}
                    />
                )}
            </div>
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

function reloadPage() {
    window.location.reload();
}

function getStationsSearchFailureToast(
    failure: RequestFailure,
    policy: StationsSearchFailurePolicy,
    retry: () => void,
) {
    if (policy.presentation !== "toast") {
        return null;
    }

    const message = getStationsSearchFailureMessage(failure);

    if (policy.recovery !== "manual-retry") {
        return { message };
    }

    return {
        message,
        action: {
            label: "다시 시도",
            onClick: retry,
        },
    };
}

function getStationsSearchFailureMessage(failure: RequestFailure) {
    switch (failure.code) {
        case "INVALID_INPUT":
        case "PAYLOAD_TOO_LARGE":
            return "입력값을 확인해주세요.";
        case "ROUTE_NOT_FOUND":
        case "METHOD_NOT_ALLOWED":
        case "INVALID_RESPONSE":
            return "요청을 처리할 수 없습니다.";
        case "OPINET_UNAVAILABLE":
        case "DATABASE_UNAVAILABLE":
        case "INTERNAL_SERVER_ERROR":
            return "요청이 실패했습니다.";
        case "OFFLINE":
            return "인터넷 연결을 확인해주세요.";
        case "NETWORK_ERROR":
        case "TIMEOUT":
            return "일시적으로 문제가 발생했습니다.";
        case "CONFIGURATION_ERROR":
        case "UNKNOWN_ERROR":
        default:
            return "예상하지 못한 문제가 발생했습니다.";
    }
}
