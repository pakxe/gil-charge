import { useCallback, useEffect, useMemo, useState } from "react";

import {
    type SearchStationByPathFailurePolicy,
    useSearchStationByPath,
} from "@/features/search-station-by-path/model/useSearchStationByPath";
import { DEFAULT_MAP_CENTER } from "@/shared/constants/map";
import { useMap } from "@/shared/model/useMap";
import { useCurrentLocation } from "@/features/search-station-by-path/model/useCurrentLocation";
import { Map } from "@/shared/ui/Map/Map";
import { MapErrorFallback, MapLoadingFallback } from "@/shared/ui/Map/MapFallback";
import { WaypointNodesLayer } from "@/features/waypoint_editor/ui/WaypointNodesLayer";
import { WaypointEdgesLayer } from "@/features/waypoint_editor/ui/WaypointEdgesLayer";
import { WaypointLassoLayer } from "@/features/waypoint_editor/ui/WaypointLassoLayer";
import { getWaypointIdsInPolygon } from "@/features/waypoint_editor/lib/getWaypointIdsInPolygon";
import { StationMarkersLayer } from "@/features/search-station-by-path/ui/StationMarkersLayer";
import type { RequestFailure } from "@/shared/lib/requestFailure";
import { useToast } from "@/shared/ui/Toast/useToast";
import { getSearchStationByPathFailureMessage } from "@/features/search-station-by-path/ui/getSearchStationByPathFailureMessage";
import { CurrentLocationMarker } from "@/features/search-station-by-path/ui/CurrentLocationMarker";
import { CurrentLocationButton } from "@/features/search-station-by-path/ui/CurrentLocationButton";
import { useWaypointEditor } from "@/features/waypoint_editor/model/useWaypointEditor";
import { useResultStations } from "@/features/search-station-by-path/model/useResultStations";
import { useSearchResultSheetLayout } from "@/features/search-station-by-path/model/useSearchResultSheetLayout";
import { WaypointToolBar } from "@/features/waypoint_editor/ui/WaypointToolBar";
import { SearchBar } from "@/features/search-station-by-path/ui/SearchBar";
import { ResultBottomSheet } from "@/features/search-station-by-path/ui/ResultBottomSheet";
import type { WaypointEditorMode, WaypointEditorStatus } from "@/features/waypoint_editor/model/waypointEditor";

export function SearchStationByPathPage() {
    const map = useMap();
    const { showToast } = useToast();

    const { status, data, actions } = useWaypointEditor({
        onAddRejected: (reason) => {
            if (reason === "OVERFLOW") {
                showToast({
                    message: "웨이포인트는 최대 20개까지 추가할 수 있습니다.",
                });
            }
        },
    });

    const [zoomLevel, setZoomLevel] = useState(8);
    const [mode, setMode] = useState<WaypointEditorMode>(INITIAL_DRAW_MODE);
    const result = useResultStations({ map });
    const { replaceStations } = result;

    const {
        state: searchStationByPathState,
        retry: retrySearchStationByPath,
        search: searchStations,
    } = useSearchStationByPath();

    useEffect(() => {
        if (searchStationByPathState.status === "success") {
            result.replaceStations(searchStationByPathState.stations);
        }
    }, [replaceStations, searchStationByPathState]);

    const centerCurrentLocation = useCallback(
        (location: { lat: number; lng: number }) => {
            map?.setCenter(location);
        },
        [map],
    );

    const handleSearch = async (radiusKm: number) => {
        if (data.waypoints.length === 0) {
            return;
        }

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

    const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);

    const searchFailure = searchStationByPathState.status === "error" ? searchStationByPathState.failure : null;
    const searchFailurePolicy = searchStationByPathState.status === "error" ? searchStationByPathState.policy : null;

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

        const toast = getSearchStationByPathFailureToast(searchFailure, searchFailurePolicy, retrySearchStationByPath);

        if (!toast) return;

        showToast(toast);
    }, [retrySearchStationByPath, searchFailure, searchFailurePolicy, showToast]);

    const currentStrokeWeight = useMemo(() => calculateStrokeWeight(zoomLevel, radiusKm), [zoomLevel, radiusKm]);

    const hasWaypoint = data.waypoints.length > 0;
    const selectedWaypointIds = getSelectedWaypointIds(status);
    const isLassoMode = mode === "lasso";
    const hasSearchResult = result.isOpen && result.stations !== null;

    const handleModeChange = (nextMode: WaypointEditorMode) => {
        setMode(nextMode);
        showToast({
            message: MODE_GUIDE_MESSAGES[nextMode],
            durationMs: MODE_GUIDE_TOAST_DURATION_MS,
        });
    };

    const {
        searchOverlayRef,
        searchOverlayVisibleHeight,
        maxSearchSheetHeight,
        searchControlsBottom,
        setSearchOverlayVisibleHeight,
    } = useSearchResultSheetLayout({
        hasSearchResult,
        stations: result.stations,
    });

    return (
        <div
            className="relative flex min-h-0 flex-1 touch-none flex-col items-center justify-end overflow-hidden bg-gil-gray-900"
            data-map-surface="search-station-by-path"
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
                    stations={result.visibleStations}
                    selectedStationId={result.selectedStationId}
                    onStationClick={(stationId) => {
                        result.selectStation({
                            source: "map",
                            stationId,
                        });
                    }}
                />
                {location && <CurrentLocationMarker location={location} isStale={currentLocationStatus === "stale"} />}
            </Map>
            <div ref={searchOverlayRef} className="pointer-events-none absolute inset-0 z-70">
                <SearchBar
                    onRadiusChange={(radius) => setRadiusKm(radius)}
                    radiusKm={radiusKm}
                    onSearch={handleSearch}
                    bottom={searchControlsBottom}
                    errorMessage={
                        searchFailure && searchFailurePolicy?.presentation === "inline"
                            ? getSearchStationByPathFailureMessage(searchFailure)
                            : null
                    }
                    searchState={
                        searchStationByPathState.status === "loading" ? "loading" : hasWaypoint ? "ready" : "disabled"
                    }
                />

                {hasSearchResult && (
                    <ResultBottomSheet
                        containerRef={searchOverlayRef}
                        maxHeight={maxSearchSheetHeight}
                        totalStationCount={result.stations?.length ?? 0}
                        stations={result.visibleStations}
                        filter={{
                            localCurrencyOnly: result.filter.localCurrencyOnly,
                            brandCodes: result.brandCodes,
                            selectedBrandCodes: result.filter.selectedBrandCodes,
                        }}
                        selection={{
                            selectedStationId: result.selectedStationId,
                            source: result.selectionSource,
                        }}
                        visibleHeight={searchOverlayVisibleHeight}
                        onVisibleHeightChange={setSearchOverlayVisibleHeight}
                        onLocalCurrencyOnlyChange={result.changeLocalCurrencyFilter}
                        onBrandFilterToggle={result.toggleBrandFilter}
                        onStationClick={(stationId) => {
                            result.selectStation(
                                {
                                    source: "list",
                                    stationId,
                                },
                                searchOverlayVisibleHeight,
                            );
                        }}
                        onClose={() => {
                            result.close();
                        }}
                    />
                )}
            </div>

            <WaypointToolBar
                mode={mode}
                hasWaypoints={hasWaypoint}
                onModeChange={handleModeChange}
                onDeleteAll={actions.deleteAllWaypoint}
                history={{
                    canUndo: data.canUndo,
                    canRedo: data.canRedo,
                    onUndo: actions.undoWaypoint,
                    onRedo: actions.redoWaypoint,
                }}
                selection={{
                    hasSelectedWaypoints: selectedWaypointIds.length > 0,
                    onDeleteSelected: () => actions.deleteBatchWaypoint(selectedWaypointIds),
                }}
            />
            <CurrentLocationButton status={currentLocationStatus} onClick={requestCurrentLocation} />
        </div>
    );
}

const DEFAULT_RADIUS_KM = 1;

const BASE_LEVEL = 6;
const BASE_STROKE_WEIGHT = 250;
const INITIAL_DRAW_MODE: WaypointEditorMode = "waypoint";
const MODE_GUIDE_TOAST_DURATION_MS = 2500;
const MODE_GUIDE_MESSAGES: Record<WaypointEditorMode, string> = {
    waypoint: "화면을 눌러 웨이포인트를 찍을 수 있습니다.",
    lasso: "올가미를 그려 여러 개의 웨이포인트를 선택할 수 있습니다.",
};

function isMoveActive(statusName: string) {
    return statusName === "moving" || statusName === "batchMoving";
}

function getSelectedWaypointIds(status: WaypointEditorStatus) {
    if (status.statusName === "selected") {
        return status.selectedNodeIds;
    }

    if (status.statusName === "moving" || status.statusName === "batchMoving") {
        return status.selectionAfterMove;
    }

    return [];
}

function calculateStrokeWeight(currentLevel: number, radiusKm: number) {
    return BASE_STROKE_WEIGHT * radiusKm * Math.pow(2, BASE_LEVEL - currentLevel);
}

function reloadPage() {
    window.location.reload();
}

function getSearchStationByPathFailureToast(
    failure: RequestFailure,
    policy: SearchStationByPathFailurePolicy,
    retry: () => void,
) {
    if (policy.presentation !== "toast") {
        return null;
    }

    const message = getSearchStationByPathFailureMessage(failure);

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
