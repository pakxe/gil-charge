import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Map, Polyline, CustomOverlayMap } from "react-kakao-maps-sdk";

import { ToolButton } from "./ToolButton";
import { Station, LatLng } from "@/shared/types/map";
import { useMapDrawing } from "@/shared/hooks/useMapDrawing";
import { useStationsSearch } from "@/shared/hooks/useStationsSearch";
import { DEFAULT_MAP_CENTER } from "@/shared/constants/map";

interface DrawPathStepProps {
    onNext: (stations: Station[]) => void;
}

type LocationStatus = "loading" | "granted" | "denied" | "unavailable" | "error";

const GEOLOCATION_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 7000,
    maximumAge: 1000 * 60 * 5,
};

const isGeolocationSupported = () => {
    return typeof navigator !== "undefined" && "geolocation" in navigator;
};

const calculateStrokeWeight = (radiusKm: number, level: number) => {
    const radiusMeters = radiusKm * 1000;
    const diameterMeters = radiusMeters * 2;

    const resolution = 0.25 * Math.pow(2, level - 1);

    return Math.round(diameterMeters / resolution);
};

export function DrawPathStep({ onNext }: DrawPathStepProps) {
    const drawing = useMapDrawing();
    const { fetchStations, isLoading } = useStationsSearch(onNext);

    const mapRef = useRef<kakao.maps.Map | null>(null);
    const hasRequestedLocationRef = useRef(false);

    const [zoomLevel, setZoomLevel] = useState(5);

    const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_MAP_CENTER);

    const [currentPosition, setCurrentPosition] = useState<LatLng | null>(null);

    const [locationStatus, setLocationStatus] = useState<LocationStatus>(() =>
        isGeolocationSupported() ? "loading" : "unavailable",
    );

    const moveToPosition = useCallback((position: LatLng) => {
        const nextPosition = {
            lat: position.lat,
            lng: position.lng,
        };

        setMapCenter(nextPosition);

        if (mapRef.current && typeof kakao !== "undefined") {
            mapRef.current.panTo(new kakao.maps.LatLng(nextPosition.lat, nextPosition.lng));
        }
    }, []);

    const handleLocationSuccess = useCallback(
        (position: GeolocationPosition) => {
            const nextPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };

            setCurrentPosition(nextPosition);
            setLocationStatus("granted");
            moveToPosition(nextPosition);
        },
        [moveToPosition],
    );

    const handleLocationError = useCallback((error: GeolocationPositionError) => {
        if (error.code === error.PERMISSION_DENIED) {
            setLocationStatus("denied");
            return;
        }

        setLocationStatus("error");
    }, []);

    useEffect(() => {
        if (hasRequestedLocationRef.current) return;
        hasRequestedLocationRef.current = true;

        if (!isGeolocationSupported()) {
            return;
        }

        navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, GEOLOCATION_OPTIONS);
    }, [handleLocationSuccess, handleLocationError]);

    const handleReturnToCurrentLocation = () => {
        if (currentPosition) {
            moveToPosition(currentPosition);
            return;
        }

        if (!isGeolocationSupported()) {
            setLocationStatus("unavailable");
            return;
        }

        setLocationStatus("loading");

        navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, GEOLOCATION_OPTIONS);
    };

    const handleSubmit = () => {
        drawing.commitWaypointPath();
        fetchStations(drawing.getAllPaths(), drawing.radius);
    };

    const dynamicStrokeWeight = calculateStrokeWeight(drawing.radius, zoomLevel);

    return (
        <div className="relative w-full h-150 bg-gi-gray-900 rounded-lg overflow-hidden flex flex-col items-center justify-end touch-none">
            {isLoading && (
                <div className="absolute inset-0 z-50 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-white mt-4 font-bold">영역 안의 주유소를 찾는 중...</p>
                </div>
            )}

            <Map
                center={mapCenter}
                isPanto={true}
                style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
                level={zoomLevel}
                onCreate={(map) => {
                    mapRef.current = map;
                }}
                onZoomChanged={(map) => setZoomLevel(map.getLevel())}
                draggable={drawing.tool !== "pen"}
                onMouseDown={drawing.handleMouseDown}
                onMouseMove={drawing.handleMouseMove}
                onMouseUp={drawing.handleMouseUp}
                onClick={drawing.handleMapClick}
                onTouchStart={drawing.handleMouseDown}
                onTouchEnd={drawing.handleMouseUp}
            >
                {currentPosition && (
                    <CustomOverlayMap position={currentPosition} zIndex={10}>
                        <div className="w-4 h-4 bg-gil-blue-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2" />
                    </CustomOverlayMap>
                )}

                {drawing.paths.map((path) => (
                    <Fragment key={path.id}>
                        <Polyline
                            path={path.points}
                            strokeWeight={dynamicStrokeWeight}
                            strokeColor="#EAB308"
                            strokeOpacity={0.3}
                            onClick={() => drawing.handlePolylineClick(path.id)}
                        />

                        <Polyline
                            path={path.points}
                            strokeWeight={4}
                            strokeColor="#EAB308"
                            strokeOpacity={1}
                            strokeStyle="solid"
                            onClick={() => drawing.handlePolylineClick(path.id)}
                        />

                        {path.type === "waypoint" &&
                            path.points.map((p, i) => (
                                <CustomOverlayMap key={i} position={p}>
                                    <div
                                        className="w-3 h-3 bg-yellow-500 rounded-full border-2 border-gray-900 shadow-sm transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                                        onClick={() => drawing.handlePolylineClick(path.id)}
                                    />
                                </CustomOverlayMap>
                            ))}
                    </Fragment>
                ))}

                {drawing.currentPath.length > 0 && (
                    <>
                        <Polyline
                            path={drawing.currentPath}
                            strokeWeight={dynamicStrokeWeight}
                            strokeColor="#EAB308"
                            strokeOpacity={0.3}
                            strokeStyle="solid"
                        />
                        <Polyline
                            path={drawing.currentPath}
                            strokeWeight={4}
                            strokeColor="#EAB308"
                            strokeOpacity={1}
                            strokeStyle="solid"
                        />
                        {drawing.tool === "waypoint" &&
                            drawing.currentPath.map((p, i) => (
                                <CustomOverlayMap key={i} position={p}>
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full border-2 border-gray-900 shadow-sm transform -translate-x-1/2 -translate-y-1/2" />
                                </CustomOverlayMap>
                            ))}
                    </>
                )}
            </Map>

            <button
                type="button"
                onClick={handleReturnToCurrentLocation}
                disabled={locationStatus === "loading"}
                aria-label="내 위치로 돌아가기"
                title="내 위치로 돌아가기"
                className="absolute top-4 right-4 z-30 flex items-center gap-1.5 rounded-full bg-gray-900/85 px-3 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-sm border border-white/10 disabled:opacity-60"
            >
                <span>{locationStatus === "loading" ? "…" : "📍"}</span>
                <span>내 위치</span>
            </button>

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
            )}

            <div className="z-20 w-full px-6 pb-6 flex flex-col gap-6 pointer-events-none">
                <div className="flex items-center justify-between w-full pointer-events-auto">
                    <div className="flex flex-col gap-1 w-2/3 max-w-50 bg-gray-900/80 p-3 rounded-2xl backdrop-blur-sm shadow-lg">
                        <span className="text-white text-sm font-bold ml-1">{drawing.radius.toFixed(1)}km</span>
                        <input
                            type="range"
                            min="0.1"
                            max="5.0"
                            step="0.1"
                            value={drawing.radius}
                            onChange={(e) => drawing.setRadius(parseFloat(e.target.value))}
                            className="w-full accent-yellow-500"
                        />
                    </div>

                    <div className="flex gap-2 bg-gray-900/80 p-2 rounded-full backdrop-blur-sm shadow-lg">
                        <ToolButton
                            isActive={drawing.tool === "pen"}
                            icon="✏️"
                            onClick={() => drawing.handleChangeTool("pen")}
                        />
                        <ToolButton
                            isActive={drawing.tool === "waypoint"}
                            icon="📍"
                            onClick={() => drawing.handleChangeTool("waypoint")}
                        />
                        <ToolButton
                            isActive={drawing.tool === "eraser"}
                            icon="🧽"
                            onClick={() => drawing.handleChangeTool("eraser")}
                        />
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
