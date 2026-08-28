import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";

import { type StationsSearchFailurePolicy, useStationsSearch } from "@/shared/hooks/useStationsSearch";
import { DEFAULT_MAP_CENTER } from "@/shared/constants/map";
import { useMap } from "@/shared/model/useMap";
import { type CurrentLocationStatus, useCurrentLocation } from "@/features/select_search_type/model/useCurrentLocation";
import { useSearchResultSheetLayout } from "@/features/select_search_type/model/useSearchResultSheetLayout";
import { useStationSelection } from "@/features/select_search_type/model/useStationSelection";
import { useWaypointEditor } from "@/features/waypoint_editor/model/useWaypointEditor";
import { Map } from "@/shared/ui/Map/Map";
import { MapErrorFallback, MapLoadingFallback } from "@/shared/ui/Map/MapFallback";
import { WaypointNodesLayer } from "@/features/waypoint_editor/ui/WaypointNodesLayer";
import { WaypointEdgesLayer } from "@/features/waypoint_editor/ui/WaypointEdgesLayer";
import { WaypointLassoLayer } from "@/features/waypoint_editor/ui/WaypointLassoLayer";
import { getWaypointIdsInPolygon } from "@/features/waypoint_editor/lib/getWaypointIdsInPolygon";
import { ResultBottomSheet } from "@/features/select_search_type/ui/ResultBottomSheet";
import { StationMarkersLayer } from "@/features/select_search_type/ui/StationMarkersLayer";
import type { RequestFailure } from "@/shared/lib/requestFailure";
import { useToast } from "@/shared/ui/Toast/useToast";
import Box from "@/shared/ui/Box/Box";
import { InlineFailurePresentation } from "@/shared/ui/InlineFailurePresentation/InlineFailurePresentation";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner/LoadingSpinner";
import { Slider } from "@/shared/ui/Slider/Slider";
import { cn } from "@/shared/utils/cn";
import { WaypointHistoryControls } from "@/features/waypoint_editor/ui/WaypointHistoryControls";
import { getVisibleStations } from "@/features/select_search_type/model/stationSelection";

type DrawMode = "waypoint" | "lasso";

export function DrawPathStep() {
    const { status, data, actions } = useWaypointEditor();
    const map = useMap();

    const [zoomLevel, setZoomLevel] = useState(8);
    const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
    const [mode, setMode] = useState<DrawMode>(INITIAL_DRAW_MODE);
    const [isSearchResultDismissed, setIsSearchResultDismissed] = useState(false);
    const [localCurrencyOnly, setLocalCurrencyOnly] = useState(false);

    const { state: stationsSearchState, retry: retryStationsSearch, search: searchStations } = useStationsSearch();
    const { showToast } = useToast();
    const centerCurrentLocation = useCallback(
        (location: { lat: number; lng: number }) => {
            map?.setCenter(location);
        },
        [map],
    );
    const {
        requestCurrentLocation,
        location,
        status: currentLocationStatus,
    } = useCurrentLocation({
        onCenterLocation: centerCurrentLocation,
        onBlocked: () => {
            showToast({
                message: "브라우저 설정에서 위치 권한을 허용한 뒤 다시 시도해주세요.",
            });
        },
        onInitialError: () => {
            showToast({
                message: "현재 위치를 얻어오는데 실패했습니다.",
            });
        },
        onStale: () => {
            showToast({
                message: "현재 위치를 새로 확인하지 못해 마지막 위치를 표시하고 있습니다.",
            });
        },
        onUnavailable: () => {
            showToast({
                message: "이 브라우저에서는 현재 위치를 사용할 수 없습니다.",
            });
        },
    });

    const stations = isSearchResultDismissed ? null : stationsSearchState.stations;
    const isLoading = stationsSearchState.status === "loading";
    const searchFailure = stationsSearchState.status === "error" ? stationsSearchState.failure : null;
    const searchFailurePolicy = stationsSearchState.status === "error" ? stationsSearchState.policy : null;

    const handleRadiusChange = (event: ChangeEvent<HTMLInputElement>) => {
        setRadiusKm(Number(event.target.value));
    };

    useEffect(() => {
        return showToast({
            message: MODE_GUIDE_MESSAGES[INITIAL_DRAW_MODE],
            durationMs: MODE_GUIDE_TOAST_DURATION_MS,
        });
    }, [showToast]);

    useEffect(() => {
        if (!searchFailure || !searchFailurePolicy) return;

        if (searchFailurePolicy.report === "always") {
            console.error("주유소 검색 실패:", searchFailure);
        }

        const toast = getStationsSearchFailureToast(searchFailure, searchFailurePolicy, retryStationsSearch);

        if (!toast) return;

        showToast(toast);
    }, [retryStationsSearch, searchFailure, searchFailurePolicy, showToast]);

    const currentStrokeWeight = useMemo(() => calculateStrokeWeight(zoomLevel, radiusKm), [zoomLevel, radiusKm]);
    const visibleStations = useMemo(
        () => (stations ? getVisibleStations(stations, localCurrencyOnly) : []),
        [localCurrencyOnly, stations],
    );
    const {
        selectedStationId,
        selectionSource,
        selectionRevision,
        selectStation,
        clearSelectedStation,
        handleLocalCurrencyOnlyChange,
    } = useStationSelection({ map, stations, visibleStations });
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

    const handleSubmit = async () => {
        if (data.waypoints.length === 0) return;

        setIsSearchResultDismissed(false);
        clearSelectedStation();
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

    const handleModeChange = (nextMode: DrawMode) => {
        setMode(nextMode);
        showToast({
            message: MODE_GUIDE_MESSAGES[nextMode],
            durationMs: MODE_GUIDE_TOAST_DURATION_MS,
        });
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
                center={DEFAULT_MAP_CENTER}
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
                    onStationClick={(stationId) => selectStation("map", stationId)}
                />
                {location && <CurrentLocationMarker location={location} isStale={currentLocationStatus === "stale"} />}
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
                        onLocalCurrencyOnlyChange={(nextLocalCurrencyOnly) => {
                            setLocalCurrencyOnly(nextLocalCurrencyOnly);
                            handleLocalCurrencyOnlyChange(nextLocalCurrencyOnly);
                        }}
                        onStationClick={(stationId) => selectStation("list", stationId, searchOverlayVisibleHeight)}
                        onClose={() => {
                            setIsSearchResultDismissed(true);
                            clearSelectedStation();
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
            <button
                type="button"
                aria-label="현재 위치로 이동"
                aria-busy={currentLocationStatus === "locating"}
                className={cn(
                    "absolute left-4 top-16 z-60 flex h-11 min-w-11 items-center justify-center rounded-full border border-white/20 px-3 text-xs font-bold shadow-lg backdrop-blur-[15px] transition-colors",
                    getCurrentLocationButtonClassName(currentLocationStatus),
                )}
                onClick={requestCurrentLocation}
            >
                {currentLocationStatus === "locating" ? (
                    <LoadingSpinner className="size-4" label="현재 위치 확인 중" />
                ) : (
                    getCurrentLocationButtonLabel(currentLocationStatus)
                )}
            </button>
        </div>
    );
}

function CurrentLocationMarker({ location, isStale }: { location: { lat: number; lng: number }; isStale: boolean }) {
    return (
        <Map.CustomOverlay position={location} xAnchor={0.5} yAnchor={0.5} zIndex={CURRENT_LOCATION_MARKER_Z_INDEX}>
            <div
                className={cn(
                    "relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-lg",
                    isStale ? "bg-gil-gray-500" : "bg-blue-500",
                )}
                aria-label={isStale ? "마지막으로 확인된 현재 위치" : "현재 위치"}
                role="img"
            >
                <span
                    className={cn("absolute h-9 w-9 rounded-full", isStale ? "bg-gil-gray-500/20" : "bg-blue-500/20")}
                />
                <span className="relative h-2 w-2 rounded-full bg-white" />
            </div>
        </Map.CustomOverlay>
    );
}

function formatRadius(radiusKm: number) {
    return Number.isInteger(radiusKm) ? String(radiusKm) : radiusKm.toFixed(1);
}

function getCurrentLocationButtonLabel(status: CurrentLocationStatus) {
    switch (status) {
        case "locating":
            return "확인 중";
        case "tracking":
            return "현위치";
        case "stale":
            return "이전 위치";
        case "blocked":
            return "권한 필요";
        case "paused":
            return "일시 정지";
        case "unavailable":
            return "사용 불가";
        case "idle":
        default:
            return "현위치";
    }
}

function getCurrentLocationButtonClassName(status: CurrentLocationStatus) {
    switch (status) {
        case "locating":
            return "bg-gil-yellow-400 text-gil-brown-900";
        case "tracking":
            return "bg-blue-500 text-white";
        case "stale":
        case "paused":
            return "bg-gil-gray-850/90 text-gil-light-text";
        case "blocked":
        case "unavailable":
            return "bg-gil-gray-850/90 text-gil-gray-500";
        case "idle":
        default:
            return "bg-[#1f1f1f]/40 text-white";
    }
}

const BASE_LEVEL = 6;
const BASE_STROKE_WEIGHT = 250;
const DEFAULT_RADIUS_KM = 1;
const CURRENT_LOCATION_MARKER_Z_INDEX = 45;
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
