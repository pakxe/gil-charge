import { env } from "@/shared/config/env";
import { MapInterface } from "@/shared/model/map";
import { KakaoMapAdapter } from "@/shared/ui/Map/KakaoMapAdapter";

type Props = MapInterface;

export function Map(props: Props) {
    switch (env.VITE_MAP_PROVIDER) {
        case "kakao":
            return <KakaoMapAdapter {...props} className={props.className} />;
    }
}
