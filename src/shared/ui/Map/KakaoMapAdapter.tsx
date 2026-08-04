import { env } from "@/shared/config/env";
import { MapInstance, MapInterface } from "@/shared/model/map";
import { setMap } from "@/shared/model/useMap";
import { PropsWithChildren, useEffect, useState } from "react";
import { Map, useKakaoLoader } from "react-kakao-maps-sdk";

type Props = MapInterface & PropsWithChildren;

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
            onCreate={setKakaoMap}
            style={{
                width: "100%",
                height: "100%",
            }}
            {...props}
        >
            {props.children}
        </Map>
    );
}
