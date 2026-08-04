import { env } from "@/shared/config/env";
import { MapMarkerInterface } from "@/shared/model/marker";
import { KakaoMarkerAdapter } from "@/shared/ui/Map/KakaoMarkerAdapter";

type Props = MapMarkerInterface;

export function Marker(props: Props) {
    switch (env.VITE_MAP_PROVIDER) {
        case "kakao":
            return <KakaoMarkerAdapter {...props} />;
    }
}
