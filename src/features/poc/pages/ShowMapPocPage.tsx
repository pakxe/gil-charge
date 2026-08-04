import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CustomOverlayMap, Map, Polyline, useKakaoLoader } from "react-kakao-maps-sdk";

type LatLng = {
    lat: number;
    lng: number;
};

type DragState = {
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startOverlayPoint: kakao.maps.Point;
};

const INITIAL_POSITION: LatLng = { lat: 33.450701, lng: 126.57066 };

export function ShowMapPocPage() {
    const [loading, error] = useKakaoLoader({
        appkey: import.meta.env.VITE_KAKAO_APP_KEY,
    });
    const [map, setMap] = useState<kakao.maps.Map | null>(null);
    const [overlayPosition, setOverlayPosition] = useState<LatLng>(INITIAL_POSITION);
    const dragStateRef = useRef<DragState | null>(null);

    const handlePointerMove = useCallback(
        (event: PointerEvent) => {
            const dragState = dragStateRef.current;

            if (!map || !dragState || dragState.pointerId !== event.pointerId) {
                return;
            }

            event.preventDefault();
            kakao.maps.event.preventMap();

            const deltaX = dragState.startClientX - event.clientX;
            const deltaY = dragState.startClientY - event.clientY;
            const newPoint = new kakao.maps.Point(
                dragState.startOverlayPoint.x - deltaX,
                dragState.startOverlayPoint.y - deltaY,
            );
            const newPosition = map.getProjection().coordsFromContainerPoint(newPoint);

            setOverlayPosition({
                lat: newPosition.getLat(),
                lng: newPosition.getLng(),
            });
        },
        [map],
    );

    const handlePointerUp = useCallback((event: PointerEvent) => {
        const dragState = dragStateRef.current;

        if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
        }

        dragStateRef.current = null;
    }, []);

    const handleOverlayPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (!map) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            kakao.maps.event.preventMap();

            const overlayLatLng = new kakao.maps.LatLng(overlayPosition.lat, overlayPosition.lng);
            const startOverlayPoint = map.getProjection().containerPointFromCoords(overlayLatLng);

            dragStateRef.current = {
                pointerId: event.pointerId,
                startClientX: event.clientX,
                startClientY: event.clientY,
                startOverlayPoint,
            };
        },
        [map, overlayPosition],
    );

    useEffect(() => {
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
        };
    }, [handlePointerMove, handlePointerUp]);

    return (
        <div>
            {!loading && !error && (
                <Map
                    center={INITIAL_POSITION}
                    style={{ width: "500px", height: "500px" }}
                    level={3}
                    draggable
                    zoomable
                    onCreate={setMap}
                >
                    <Polyline
                        path={[INITIAL_POSITION, overlayPosition]}
                        strokeWeight={4}
                        strokeColor={"#111827"}
                        strokeOpacity={0.7}
                        strokeStyle={"solid"}
                    />
                    <CustomOverlayMap position={overlayPosition} clickable zIndex={10}>
                        <div
                            className="touch-none cursor-grab select-none rounded border border-gray-950 bg-yellow-400 px-3 py-2 text-sm font-bold text-gray-950 shadow-lg active:cursor-grabbing"
                            onPointerDown={handleOverlayPointerDown}
                        >
                            드래그 해주세요 :D
                        </div>
                    </CustomOverlayMap>
                </Map>
            )}
        </div>
    );
}
