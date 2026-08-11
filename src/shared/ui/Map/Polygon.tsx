import { env } from "@/shared/config/env";
import type { MapPolygonInterface } from "@/shared/model/polygon";
import { KakaoPolygonAdapter } from "@/shared/ui/Map/KakaoPolygonAdapter";

type Props = MapPolygonInterface;

export function Polygon(props: Props) {
    switch (env.VITE_MAP_PROVIDER) {
        case "kakao":
            return <KakaoPolygonAdapter {...props} />;
    }
}
