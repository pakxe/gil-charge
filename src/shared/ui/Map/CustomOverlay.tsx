import { env } from "@/shared/config/env";
import { MapCustomOverlayInterface } from "@/shared/model/customOverlay";
import { KakaoCustomOverlayAdapter } from "@/shared/ui/Map/KakaoCustomOverlayAdapter";

type Props = MapCustomOverlayInterface;

export function CustomOverlay(props: Props) {
    switch (env.VITE_MAP_PROVIDER) {
        case "kakao":
            return <KakaoCustomOverlayAdapter {...props} />;
    }
}
