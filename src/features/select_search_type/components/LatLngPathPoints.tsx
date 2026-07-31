import { CustomOverlayMap, useMap } from "react-kakao-maps-sdk";

import type { LatLng } from "@/shared/types/map";
import { useCallback, useEffect, useRef } from "react";

interface Props {
    points: LatLng[];
    onDragStart?: (latLng: LatLng) => void;
    onDragMove?: (latLng: LatLng) => void;
    onDragEnd?: () => void;
}

export function KakaoPoints({ points, onDragStart, onDragEnd, onDragMove }: Props) {
    const map = useMap("points");

    const isDrawingRef = useRef(false);

    const getLatLngFromPointer = useCallback(
        (clientX: number, clientY: number): LatLng => {
            const rect = map.getNode().getBoundingClientRect();
            const point = new kakao.maps.Point(clientX - rect.left, clientY - rect.top);
            const latLng = map.getProjection().coordsFromContainerPoint(point);

            return {
                lat: latLng.getLat(),
                lng: latLng.getLng(),
            };
        },
        [map],
    );

    // useEffect(() => {
    //     const handlePointerDown = (event: PointerEvent) => {
    //         if (event.pointerType === "mouse") {
    //             if (event.button === 2) {
    //                 isDrawingRef.current = false;
    //                 map.setDraggable(true);
    //             } else if (event.button === 0) {
    //                 isDrawingRef.current = true;
    //                 map.setDraggable(false);
    //                 onDragStart?.(getLatLngFromPointer(event.clientX, event.clientY));
    //             }
    //         } else if (event.pointerType === "touch") {
    //             // if {
    //             // }
    //         } else {
    //             return;
    //         }
    //     };

    //     const handlePointerMove = (event: PointerEvent) => {
    //         if (!isDrawingRef.current || (event.pointerType === "mouse" && !(event.buttons & 1))) {
    //             if (isDrawingRef.current) {
    //                 isDrawingRef.current = false;
    //                 map.setDraggable(true);
    //             }
    //             return;
    //         }

    //         onDragMove?.(getLatLngFromPointer(event.clientX, event.clientY));
    //     };

    //     const handlePointerUp = () => {
    //         if (!isDrawingRef.current) {
    //             return;
    //         }

    //         isDrawingRef.current = false;
    //         map.setDraggable(true);

    //         onDragEnd?.();
    //     };

    //     const handleContextMenu = (e: MouseEvent) => {
    //         e.stopPropagation();

    //         isDrawingRef.current = false;
    //         map.setDraggable(true);
    //     };

    //     window.addEventListener("pointerdown", handlePointerDown);
    //     window.addEventListener("pointermove", handlePointerMove);
    //     window.addEventListener("pointerup", handlePointerUp);
    //     window.addEventListener("pointerleave", handlePointerUp);
    //     window.addEventListener("contextmenu", handleContextMenu);

    //     return () => {
    //         window.removeEventListener("pointerdown", handlePointerDown);
    //         window.removeEventListener("pointermove", handlePointerMove);
    //         window.removeEventListener("pointerup", handlePointerUp);
    //         window.removeEventListener("pointerleave", handlePointerUp);
    //         window.removeEventListener("contextmenu", handleContextMenu);
    //     };
    // }, []);

    return (
        <>
            {points.map((point, index) => (
                <CustomOverlayMap key={`${point.lat}-${point.lng}-${index}`} position={point} zIndex={20}>
                    <div className="relative flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-gray-900 bg-yellow-500 shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-900" />
                    </div>
                </CustomOverlayMap>
            ))}
        </>
    );
}
