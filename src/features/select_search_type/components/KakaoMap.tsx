import { MapInterface } from "@/shared/types/map";
import { useCallback, useEffect, useRef } from "react";
import { Map, Polyline, CustomOverlayMap } from "react-kakao-maps-sdk";

type Props = MapInterface & {};

export function KakaoMap({
    center,
    currentLocation,
    isTracking,
    zoomLevel,
    isDraggable,
    onZoomLevelChange,
    onDragStart,
}: Props) {
    const mapRef = useRef<kakao.maps.Map | null>(null);

    const handleTracking = useCallback(() => {
        if (!isTracking || !currentLocation) {
            return;
        }

        mapRef.current?.panTo(new kakao.maps.LatLng(currentLocation.lat, currentLocation.lng));
    }, [isTracking, currentLocation]);

    useEffect(() => {
        handleTracking();
    }, [isTracking, handleTracking]);

    return (
        <Map
            center={center}
            style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
            level={zoomLevel}
            onZoomChanged={(map) => onZoomLevelChange?.(map.getLevel())}
            // draggable={drawing.tool !== "pen"}
            draggable={isDraggable}
            isPanto={true}
            onDragEnd={() => handleTracking()}
            onCreate={(map) => {
                mapRef.current = map;
            }}
            onDragStart={() => onDragStart?.()}

            // onMouseDown={drawing.handleMouseDown}
            // onMouseMove={drawing.handleMouseMove}
            // onMouseUp={drawing.handleMouseUp}
            // onClick={drawing.handleMapClick}
            // onTouchStart={drawing.handleMouseDown}
            // onTouchEnd={drawing.handleMouseUp}
        >
            {currentLocation && (
                <CustomOverlayMap position={currentLocation} zIndex={10}>
                    <div className="w-4 h-4 bg-gil-blue-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2" />
                </CustomOverlayMap>
            )}

            {/* {drawing.paths.map((path) => (
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
            ))} */}

            {/* {drawing.currentPath.length > 0 && (
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
            )} */}
        </Map>
    );
}
