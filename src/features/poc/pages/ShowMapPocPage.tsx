import { useKakaoLoader, Map } from "react-kakao-maps-sdk";

export function ShowMapPocPage() {
    const [loading, error] = useKakaoLoader({
        appkey: import.meta.env.VITE_KAKAO_APP_KEY,
    });

    return (
        <div>
            {!loading && !error && (
                <Map
                    center={{ lat: 33.450701, lng: 126.57066 }}
                    style={{ width: "500px", height: "500px" }}
                    level={3}
                    draggable
                    zoomable
                ></Map>
            )}
        </div>
    );
}
