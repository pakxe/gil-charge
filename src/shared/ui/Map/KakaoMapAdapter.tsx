import { env } from "@/shared/config/env";
import { MapInstance, MapInterface } from "@/shared/model/map";
import { setMap } from "@/shared/model/useMap";
import { useEffect, useState } from "react";
import { Map, useKakaoLoader } from "react-kakao-maps-sdk";

type Props = MapInterface;

export function KakaoMapAdapter(props: Props) {
    const [loading, error] = useKakaoLoader({
        appkey: env.VITE_KAKAO_APP_KEY,
    });

    const [kakaoMap, setKakaoMap] = useState<kakao.maps.Map | null>(null);

    useEffect(() => {
        if (!kakaoMap) return;

        const mapInstance: MapInstance = {
            setCenter(latLng) {
                kakaoMap.setCenter(new kakao.maps.LatLng(latLng.lat, latLng.lng));
            },
            setZoom(level) {
                kakaoMap.setLevel(level);
            },
        };

        setMap(mapInstance);

        return () => {
            setMap(null);
        };
    }, [kakaoMap]);

    if (loading) {
        return props.loadingFallback;
    }

    if (error) {
        return props.errorFallback;
    }

    return (
        <Map
            center={props.center}
            level={props.zoomLevel}
            draggable={props.isDraggable}
            zoomable={props.isZoomable}
            className={props.className}
            onCreate={setKakaoMap}
            onZoomChanged={(map) => props.onZoomLevelChange?.(map.getLevel())}
            onClick={(_, mouseEvent) => {
                props.onClick?.({
                    lat: mouseEvent.latLng.getLat(),
                    lng: mouseEvent.latLng.getLng(),
                });
            }}
            onDragStart={(_, mouseEvent) => {
                props.onDragStart?.({
                    lat: mouseEvent.latLng.getLat(),
                    lng: mouseEvent.latLng.getLng(),
                });
            }}
            onDrag={(_, mouseEvent) => {
                props.onDragMove?.({
                    lat: mouseEvent.latLng.getLat(),
                    lng: mouseEvent.latLng.getLng(),
                });
            }}
            onDragEnd={(map) => {
                const center = map.getCenter();

                props.onDragEnd?.({
                    lat: center.getLat(),
                    lng: center.getLng(),
                });
            }}
            style={{
                width: "100%",
                height: "100%",
            }}
        >
            {props.children}
        </Map>
    );
}
