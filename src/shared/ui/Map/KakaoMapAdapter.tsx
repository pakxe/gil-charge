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
            getLevel() {
                return kakaoMap.getLevel();
            },
            getBounds() {
                const bounds = kakaoMap.getBounds();
                const southWest = bounds.getSouthWest();
                const northEast = bounds.getNorthEast();

                return {
                    southWest: {
                        lat: southWest.getLat(),
                        lng: southWest.getLng(),
                    },
                    northEast: {
                        lat: northEast.getLat(),
                        lng: northEast.getLng(),
                    },
                };
            },
            panBy(deltaX, deltaY) {
                kakaoMap.panBy(deltaX, deltaY);
            },
            getContainer() {
                return kakaoMap.getNode();
            },
            clientPointToLatLng(clientX, clientY) {
                const rect = kakaoMap.getNode().getBoundingClientRect();
                const containerPoint = new kakao.maps.Point(clientX - rect.left, clientY - rect.top);
                const latLng = kakaoMap.getProjection().coordsFromContainerPoint(containerPoint);

                return {
                    lat: latLng.getLat(),
                    lng: latLng.getLng(),
                };
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
