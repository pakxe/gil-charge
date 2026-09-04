import { useCallback, useEffect, useMemo, useState } from "react";

import { useSearchStationByPath } from "@/features/search-station-by-path/model/useSearchStationByPath";
import {
    MAX_PATH_SEARCH_WAYPOINT_COUNT,
    normalizeLatLng,
    normalizeRadiusKm,
    type ParsedPathSearchLocation,
    type PathSearchCriteria,
    type PathSearchFilter,
} from "@/features/search-station-by-path/model/pathSearchState";
import {
    readPathSearchDraft,
    writePathSearchDraft,
} from "@/features/search-station-by-path/model/pathSearchDraftStorage";
import { useCurrentLocation } from "@/features/search-station-by-path/model/useCurrentLocation";
import { usePathSearchLocation } from "@/features/search-station-by-path/model/usePathSearchLocation";
import { usePathSearchSynchronization } from "@/features/search-station-by-path/model/usePathSearchSynchronization";
import { useResultStations } from "@/features/search-station-by-path/model/useResultStations";
import { useSearchResultSheetLayout } from "@/features/search-station-by-path/model/useSearchResultSheetLayout";
import { getResultSheetDefaultHeight } from "@/features/search-station-by-path/model/resultBottomSheet";
import { getSearchStationByPathFailureMessage } from "@/features/search-station-by-path/ui/getSearchStationByPathFailureMessage";
import { getPathSearchAdjustmentMessage } from "@/features/search-station-by-path/ui/getPathSearchAdjustmentMessage";
import { CurrentLocationButton } from "@/features/search-station-by-path/ui/CurrentLocationButton";
import { CurrentLocationMarker } from "@/features/search-station-by-path/ui/CurrentLocationMarker";
import { ResultBottomSheet } from "@/features/search-station-by-path/ui/ResultBottomSheet";
import { SearchBar } from "@/features/search-station-by-path/ui/SearchBar";
import { StationMarkersLayer } from "@/features/search-station-by-path/ui/StationMarkersLayer";
import { getWaypointIdsInPolygon } from "@/features/waypoint_editor/lib/getWaypointIdsInPolygon";
import { useWaypointEditor } from "@/features/waypoint_editor/model/useWaypointEditor";
import type { WaypointEditorMode, WaypointEditorStatus } from "@/features/waypoint_editor/model/waypointEditor";
import { WaypointEdgesLayer } from "@/features/waypoint_editor/ui/WaypointEdgesLayer";
import { WaypointLassoLayer } from "@/features/waypoint_editor/ui/WaypointLassoLayer";
import { WaypointNodesLayer } from "@/features/waypoint_editor/ui/WaypointNodesLayer";
import { WaypointToolBar } from "@/features/waypoint_editor/ui/WaypointToolBar";
import { DEFAULT_MAP_CENTER } from "@/shared/constants/map";
import type { LatLng, MapInstance } from "@/shared/model/map";
import { useMap } from "@/shared/model/useMap";
import { Map } from "@/shared/ui/Map/Map";
import { MapErrorFallback, MapLoadingFallback } from "@/shared/ui/Map/MapFallback";
import { useToast } from "@/shared/ui/Toast/useToast";

export function SearchStationByPathPage() {
    const map = useMap();
    const { showToast } = useToast();
    const { parsed, replaceNormalizedSearch, replaceWithDraft, replaceWithResult } = usePathSearchLocation();
    const mode = parsed.mode === "result" ? "result" : "draft";
    const onInvalidResult = useCallback(() => {
        showToast({ message: "검색 조건을 확인할 수 없어 편집 화면으로 돌아갑니다." });
    }, [showToast]);
    const onAdjustment = useCallback(
        (adjustment: Parameters<typeof getPathSearchAdjustmentMessage>[0]) => {
            const message = getPathSearchAdjustmentMessage(adjustment);
            if (message) showToast({ message });
        },
        [showToast],
    );
    const [initialCriteria] = useState<PathSearchCriteria>(() => getInitialCriteria(parsed));
    const { status, data, actions } = useWaypointEditor({
        initialWaypoints: initialCriteria.waypoints,
        maxWaypointCount: MAX_PATH_SEARCH_WAYPOINT_COUNT,
        onAddRejected: (reason) => {
            if (reason === "OVERFLOW") {
                showToast({
                    message: `웨이포인트는 최대 ${MAX_PATH_SEARCH_WAYPOINT_COUNT}개까지 추가할 수 있습니다.`,
                });
            }
        },
        onWaypointsCommit: handleWaypointsCommit,
    });
    const { restoreWaypoints } = actions;
    const [radiusKm, setRadiusKm] = useState(initialCriteria.radiusKm);
    const [zoomLevel, setZoomLevel] = useState(INITIAL_MAP_ZOOM_LEVEL);
    const [editorMode, setEditorMode] = useState<WaypointEditorMode>("waypoint");
    const result = useResultStations({ map });
    const { replaceStations, replaceFilter, reset: resetResult } = result;
    const { state: request, retry, reset: resetRequest, search } = useSearchStationByPath();
    const loading = request.status === "loading";
    const normalizedWaypoints = useMemo(
        () => data.waypoints.map((waypoint) => normalizeLatLng(waypoint.latLng)),
        [data.waypoints],
    );

    useEffect(() => {
        if (!map || initialCriteria.waypoints.length === 0) return;

        fitInitialWaypoints(map, initialCriteria.waypoints, INITIAL_MAP_BOTTOM_PADDING);
    }, [initialCriteria, map]);

    const { effectiveRadiusKm, requestKey } = usePathSearchSynchronization({
        parsed,
        radiusKm,
        restoreWaypoints,
        setRadiusKm,
        replaceNormalizedSearch,
        resetRequest,
        resetResult,
        replaceFilter,
        onInvalidResult,
        onAdjustment,
    });

    useEffect(() => {
        if (requestKey === null) return;

        const criteria = JSON.parse(requestKey) as PathSearchCriteria;

        void search([{ type: "waypoint", points: criteria.waypoints, id: "url-result" }], criteria.radiusKm);
    }, [requestKey, search]);

    useEffect(() => {
        if (request.status === "success") replaceStations(request.stations);
    }, [replaceStations, request]);

    const failure = request.status === "error" ? request.failure : null;
    const failurePolicy = request.status === "error" ? request.policy : null;
    useEffect(() => {
        if (!failure || !failurePolicy) return;
        if (failurePolicy.report === "always") console.error("주유소 검색 실패:", failure);
        if (failurePolicy.presentation === "toast") {
            showToast({
                message: getSearchStationByPathFailureMessage(failure),
                action:
                    failurePolicy.recovery === "manual-retry"
                        ? {
                              label: "다시 시도",
                              onClick: retry,
                          }
                        : undefined,
            });
        }
    }, [failure, failurePolicy, retry, showToast]);

    useEffect(
        () => showToast({ message: "화면을 눌러 웨이포인트를 찍을 수 있습니다.", durationMs: 2500 }),
        [showToast],
    );

    const {
        requestCurrentLocation,
        location: currentLocation,
        status: currentLocationStatus,
    } = useCurrentLocation({
        onCenterLocation: (point) => map?.setCenter(point),
        onBlocked: () => showToast({ message: "브라우저 설정에서 위치 권한을 허용한 뒤 다시 시도해주세요." }),
        onInitialError: () => showToast({ message: "현재 위치를 얻어오는데 실패했습니다." }),
        onStale: () => showToast({ message: "현재 위치를 새로 확인하지 못해 마지막 위치를 표시하고 있습니다." }),
        onUnavailable: () => showToast({ message: "이 브라우저에서는 현재 위치를 사용할 수 없습니다." }),
    });

    function changeRadius(value: number) {
        if (loading) return;
        const nextRadius = normalizeRadiusKm(value);
        setRadiusKm(nextRadius);
        persistCriteria({ waypoints: normalizedWaypoints, radiusKm: nextRadius });
    }

    function handleWaypointsCommit(waypoints: PathSearchCriteria["waypoints"]) {
        persistCriteria({ waypoints: waypoints.map(normalizeLatLng), radiusKm: effectiveRadiusKm });
    }

    function persistCriteria(criteria: PathSearchCriteria) {
        writePathSearchDraft(window.sessionStorage, criteria);
        if (mode === "result") replaceWithDraft();
    }

    function startSearch() {
        if (loading || data.waypoints.length === 0) return;
        replaceWithResult({
            waypoints: normalizedWaypoints,
            radiusKm: effectiveRadiusKm,
            ...EMPTY_FILTER,
        });
    }

    function toggleBrand(brandCode: string) {
        if (parsed.mode !== "result") return;
        const selectedBrandCodes = result.filter.selectedBrandCodes.includes(brandCode)
            ? result.filter.selectedBrandCodes.filter((code) => code !== brandCode)
            : [...result.filter.selectedBrandCodes, brandCode];
        result.toggleBrandFilter(brandCode);
        replaceWithResult({ ...parsed.criteria, selectedBrandCodes });
    }

    function changeLocalCurrency(localCurrencyOnly: boolean) {
        if (parsed.mode !== "result") return;
        result.changeLocalCurrencyFilter(localCurrencyOnly);
        replaceWithResult({ ...parsed.criteria, localCurrencyOnly });
    }

    const hasWaypoint = data.waypoints.length > 0;
    const selectedIds = getSelectedWaypointIds(status);
    const lassoEnabled = editorMode === "lasso" && !loading;
    const hasResult = mode === "result" && result.isOpen && result.stations !== null;
    const barState = getBarState(request.status, hasWaypoint);
    const failureMessage =
        failure && failurePolicy?.presentation === "inline" ? getSearchStationByPathFailureMessage(failure) : null;
    const { searchOverlayRef, searchOverlayVisibleHeight, maxSearchSheetHeight, setSearchOverlayVisibleHeight } =
        useSearchResultSheetLayout({ hasSearchResult: hasResult, stations: result.stations });
    useEffect(() => {
        if (
            !map ||
            mode !== "result" ||
            !hasResult ||
            maxSearchSheetHeight === 0 ||
            initialCriteria.waypoints.length === 0
        ) {
            return;
        }

        fitInitialWaypoints(
            map,
            initialCriteria.waypoints,
            getResultSheetDefaultHeight(maxSearchSheetHeight) + INITIAL_MAP_BOTTOM_PADDING,
        );
    }, [hasResult, initialCriteria, map, maxSearchSheetHeight, mode]);
    const searchBar = (className: string) => (
        <SearchBar
            className={className}
            radiusKm={effectiveRadiusKm}
            onRadiusChange={changeRadius}
            onSearch={startSearch}
            searchState={barState}
            errorMessage={failureMessage}
        />
    );

    return (
        <div
            className="relative flex min-h-0 flex-1 touch-none flex-col items-center justify-end overflow-hidden bg-gil-gray-900"
            data-map-surface="search-station-by-path"
            data-search-mode={mode}
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
                isDraggable={!lassoEnabled && !isMoveActive(status.statusName)}
                isZoomable={!lassoEnabled}
                onZoomLevelChange={setZoomLevel}
                onClick={(point) => {
                    if (!lassoEnabled && !loading) actions.addWaypoint(normalizeLatLng(point));
                }}
            >
                <WaypointNodesLayer
                    disabled={loading}
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
                <WaypointEdgesLayer
                    waypoints={data.visibleWaypoints}
                    weight={250 * effectiveRadiusKm * Math.pow(2, 6 - zoomLevel)}
                />
                <WaypointLassoLayer
                    key={`${editorMode}-${loading}`}
                    enabled={lassoEnabled}
                    onComplete={(path) => actions.selectWaypoints(getWaypointIdsInPolygon(data.waypoints, path))}
                />
                <StationMarkersLayer
                    stations={mode === "result" ? result.visibleStations : []}
                    selectedStationId={result.selectedStationId}
                    onStationClick={(stationId) => result.selectStation({ source: "map", stationId })}
                />
                {currentLocation && (
                    <CurrentLocationMarker location={currentLocation} isStale={currentLocationStatus === "stale"} />
                )}
            </Map>
            <div ref={searchOverlayRef} className="pointer-events-none absolute inset-0 z-70">
                {hasResult ? (
                    <div
                        className="pointer-events-none absolute inset-x-0 bottom-0"
                        style={{ height: searchOverlayVisibleHeight }}
                    >
                        {searchBar("absolute inset-x-0 bottom-full mb-5")}
                        <ResultBottomSheet
                            className="absolute inset-x-0 bottom-0"
                            containerRef={searchOverlayRef}
                            maxHeight={maxSearchSheetHeight}
                            totalStationCount={result.stations?.length ?? 0}
                            stations={result.visibleStations}
                            filter={{
                                localCurrencyOnly: result.filter.localCurrencyOnly,
                                brandCodes: result.brandCodes,
                                selectedBrandCodes: result.filter.selectedBrandCodes,
                            }}
                            selection={{ selectedStationId: result.selectedStationId, source: result.selectionSource }}
                            visibleHeight={searchOverlayVisibleHeight}
                            onVisibleHeightChange={setSearchOverlayVisibleHeight}
                            onLocalCurrencyOnlyChange={changeLocalCurrency}
                            onBrandFilterToggle={toggleBrand}
                            onStationClick={(stationId) =>
                                result.selectStation({ source: "list", stationId }, searchOverlayVisibleHeight)
                            }
                            onClose={result.close}
                        />
                    </div>
                ) : (
                    searchBar("absolute inset-x-0 bottom-10")
                )}
            </div>
            <WaypointToolBar
                disabled={loading}
                mode={editorMode}
                hasWaypoints={hasWaypoint}
                onModeChange={(next) => {
                    if (!loading) {
                        setEditorMode(next);
                        showToast({
                            message:
                                next === "waypoint"
                                    ? "화면을 눌러 웨이포인트를 찍을 수 있습니다."
                                    : "올가미를 그려 여러 개의 웨이포인트를 선택할 수 있습니다.",
                            durationMs: 2500,
                        });
                    }
                }}
                onDeleteAll={actions.deleteAllWaypoint}
                history={{
                    canUndo: data.canUndo,
                    canRedo: data.canRedo,
                    onUndo: actions.undoWaypoint,
                    onRedo: actions.redoWaypoint,
                }}
                selection={{
                    hasSelectedWaypoints: selectedIds.length > 0,
                    onDeleteSelected: () => actions.deleteBatchWaypoint(selectedIds),
                }}
            />
            <CurrentLocationButton status={currentLocationStatus} onClick={requestCurrentLocation} />
        </div>
    );
}

const EMPTY_FILTER: PathSearchFilter = { localCurrencyOnly: false, selectedBrandCodes: [] };
const INITIAL_MAP_ZOOM_LEVEL = 8;
const INITIAL_MAP_BOTTOM_PADDING = 180;

function fitInitialWaypoints(map: MapInstance, waypoints: LatLng[], bottomPadding: number) {
    map.fitPoints(waypoints, {
        top: 80,
        right: 48,
        bottom: bottomPadding,
        left: 48,
    });
    if (map.getLevel() < INITIAL_MAP_ZOOM_LEVEL) map.setZoom(INITIAL_MAP_ZOOM_LEVEL);
}

function getInitialCriteria(parsed: ParsedPathSearchLocation): PathSearchCriteria {
    return parsed.mode === "result"
        ? { waypoints: parsed.criteria.waypoints, radiusKm: parsed.criteria.radiusKm }
        : readPathSearchDraft(window.sessionStorage).draft;
}

function getBarState(
    status: "idle" | "loading" | "success" | "error",
    hasWaypoint: boolean,
): "ready" | "disabled" | "loading" | "error" {
    if (status === "loading") return "loading";
    if (status === "error") return "error";
    return hasWaypoint ? "ready" : "disabled";
}

function getSelectedWaypointIds(status: WaypointEditorStatus) {
    if (status.statusName === "selected") return status.selectedNodeIds;
    if (status.statusName === "moving" || status.statusName === "batchMoving") return status.selectionAfterMove;
    return [];
}

function isMoveActive(status: string) {
    return status === "moving" || status === "batchMoving";
}
function reloadPage() {
    window.location.reload();
}
