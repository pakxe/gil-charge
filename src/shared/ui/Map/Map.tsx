import { env } from "@/shared/config/env";
import { MapInterface } from "@/shared/model/map";
import { KakaoMapAdapter } from "@/shared/ui/Map/KakaoMapAdapter";
import { CustomOverlay } from "@/shared/ui/Map/CustomOverlay";
import { Polyline } from "@/shared/ui/Map/Polyline";

type Props = MapInterface;

function MapComponent(props: Props) {
    switch (env.VITE_MAP_PROVIDER) {
        case "kakao":
            return <KakaoMapAdapter {...props} className={props.className} />;
    }
}

export const Map = Object.assign(MapComponent, {
    CustomOverlay: CustomOverlay,
    Polyline: Polyline,
});
