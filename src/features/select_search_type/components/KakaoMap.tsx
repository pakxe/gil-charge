import type { LatLng, MapInterface } from "@/shared/types/map";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Kakao from "react-kakao-maps-sdk";

type Props = MapInterface & {
    children?: ReactNode;
    isGeneralDraggable?: boolean; // 우클 패닝, 두손가락 패닝으로 지도 이동이 가능하게 한다.
};

export function KakaoMap({
    center,
    currentLocation,
    isTracking,
    zoomLevel,
    isDraggable,
    isGeneralDraggable,
    onZoomLevelChange,
    onClick,
    onDragStart,
    onDragMove,
    onDragEnd,
    children,
}: Props) {
    const [map, setMap] = useState<kakao.maps.Map | null>(null);
    const isPointerDrawingRef = useRef(false);

    const handleTracking = useCallback(() => {
        if (!isTracking || !currentLocation) {
            return;
        }

        map?.panTo(new kakao.maps.LatLng(currentLocation.lat, currentLocation.lng));
    }, [isTracking, currentLocation, map]);

    useEffect(() => {
        handleTracking();
    }, [isTracking, handleTracking]);

    const getPointerLatLng = useCallback(
        (event: React.PointerEvent<HTMLDivElement>): LatLng | null => {
            if (!map) {
                return null;
            }

            const rect = event.currentTarget.getBoundingClientRect();
            const point = new kakao.maps.Point(event.clientX - rect.left, event.clientY - rect.top);
            const latLng = map.getProjection().coordsFromContainerPoint(point);

            return {
                lat: latLng.getLat(),
                lng: latLng.getLng(),
            };
        },
        [map],
    );

    useEffect(() => {
        if (!isGeneralDraggable) {
            return;
        }

        let startCenter: kakao.maps.LatLng | null = null;

        const activePointers = new Map<number, { x: number; y: number }>();
        let isRightClickDragging = false;
        let startPos = { x: 0, y: 0 };

        if (!map) return;

        const handlePointerDown = (event: PointerEvent) => {
            // case 1: 우클릭 패닝
            if (isMouseRightButton(event)) {
                isRightClickDragging = true;
                startPos = { x: event.clientX, y: event.clientY };
                startCenter = map.getCenter(); // 시작할 때의 지도 중심 저장

                return;
            }

            activePointers.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
            });

            // case 2: 두손가락 패닝
            if (activePointers.size === 2) {
                const center = getCenterPos([...activePointers.values()]);

                if (center) {
                    startPos = center;
                    startCenter = map.getCenter(); // 시작할 때의 지도 중심 저장
                }
            }
        };

        const handlePointerMove = (event: PointerEvent) => {
            if (!startCenter) {
                return;
            }

            activePointers.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
            });

            let currentPos = { x: 0, y: 0 };

            if (isRightClickDragging) {
                // case 1

                currentPos = { x: event.clientX, y: event.clientY };
            } else if (activePointers.size === 2) {
                // case 2

                const center = getCenterPos([...activePointers.values()]);

                if (!center) {
                    return;
                }

                currentPos = {
                    x: center.x,
                    y: center.y,
                };
            } else {
                return;
            }

            const dx = startPos.x - currentPos.x;
            const dy = startPos.y - currentPos.y;

            const projection = map.getProjection();
            const startPixel = projection.pointFromCoords(startCenter);
            const nextPixel = new kakao.maps.Point(startPixel.x + dx, startPixel.y + dy);
            const nextCenter = projection.coordsFromPoint(nextPixel);

            map.setCenter(nextCenter);
        };

        const handlePointerUp = (event: PointerEvent) => {
            activePointers.delete(event.pointerId);
            if (isMouseRightButton(event)) {
                isRightClickDragging = false;
                startCenter = null;
            }
            if (activePointers.size < 2) {
                startCenter = null;
            }
        };

        // 우클릭 메뉴 감추기
        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault();
        };

        window.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);
        window.addEventListener("contextmenu", handleContextMenu);

        return () => {
            window.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
            window.removeEventListener("contextmenu", handleContextMenu);
        };
    }, [isGeneralDraggable, map]);

    return (
        <Kakao.Map
            center={center}
            style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
            level={zoomLevel}
            onZoomChanged={(map) => onZoomLevelChange?.(map.getLevel())}
            draggable={isDraggable}
            zoomable={true}
            isPanto={true}
            onDragEnd={() => {
                handleTracking();
                onDragEnd?.();
            }}
            onClick={(map, mouseEvent) => {
                onClick?.({
                    lat: mouseEvent.latLng.getLat(),
                    lng: mouseEvent.latLng.getLng(),
                });
            }}
            onCreate={(map) => {
                setMap(map);
            }}
            onPointerDown={(event) => {
                if (event.button !== 0) return;

                isPointerDrawingRef.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);

                const latLng = getPointerLatLng(event);

                if (!latLng) {
                    return;
                }

                onDragStart?.(latLng);
            }}
            onPointerMove={(event) => {
                if (isDraggable || !isPointerDrawingRef.current) {
                    return;
                }

                const latLng = getPointerLatLng(event);

                if (!latLng) {
                    return;
                }

                onDragMove?.(latLng);
            }}
            onPointerUp={(event) => {
                if (event.button !== 0 || !isPointerDrawingRef.current) {
                    return;
                }

                isPointerDrawingRef.current = false;

                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                }

                onDragEnd?.();
            }}
            // onMouseDown={drawing.handleMouseDown}
            // onMouseMove={drawing.handleMouseMove}
            // onMouseUp={drawing.handleMouseUp}
            // onClick={drawing.handleMapClick}
            // onTouchStart={drawing.handleMouseDown}
            // onTouchEnd={drawing.handleMouseUp}
        >
            {currentLocation && (
                <Kakao.CustomOverlayMap position={currentLocation} zIndex={10}>
                    <div className="w-4 h-4 bg-gil-blue-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2" />
                </Kakao.CustomOverlayMap>
            )}

            {children}

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
        </Kakao.Map>
    );
}

function isMouseRightButton(event: PointerEvent) {
    return event.pointerType === "mouse" && event.button === 2;
}

function getCenterPos(pointers: { x: number; y: number }[]) {
    const p1 = pointers[0];
    const p2 = pointers[1];

    if (!p1 || !p2) {
        return null;
    }

    return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
    };
}
