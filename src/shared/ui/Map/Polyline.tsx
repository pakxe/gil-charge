import { env } from "@/shared/config/env";
import { MapPolylineInterface } from "@/shared/model/polyline";
import { KakaoPolylineAdapter } from "@/shared/ui/Map/KakaoPolylineAdapter";

type Props = MapPolylineInterface;

export function Polyline(props: Props) {
    switch (env.VITE_MAP_PROVIDER) {
        case "kakao":
            return <KakaoPolylineAdapter {...props} />;
    }
}
