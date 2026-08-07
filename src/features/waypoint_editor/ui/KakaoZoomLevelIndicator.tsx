import { useEffect, useState } from "react";
import { useMap } from "react-kakao-maps-sdk";

export function KakaoZoomLevelIndicator() {
    const map = useMap("KakaoZoomLevelIndicator");
    const [zoomLevel, setZoomLevel] = useState(() => map.getLevel());

    useEffect(() => {
        const updateZoomLevel = () => {
            setZoomLevel(map.getLevel());
        };

        updateZoomLevel();
        kakao.maps.event.addListener(map, "zoom_changed", updateZoomLevel);

        return () => {
            kakao.maps.event.removeListener(map, "zoom_changed", updateZoomLevel);
        };
    }, [map]);

    return (
        <section className="absolute right-4 top-4 z-10 rounded-lg border border-white/10 bg-gray-950/85 px-4 py-3 text-sm shadow-lg backdrop-blur-sm">
            <p className="text-xs font-semibold text-gil-gray-600">카카오맵 줌 레벨</p>
            <p className="mt-1 text-2xl font-black leading-none text-gil-yellow-400">{zoomLevel}</p>
        </section>
    );
}
