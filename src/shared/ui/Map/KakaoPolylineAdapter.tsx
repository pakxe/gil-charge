import { MapPolylineInterface } from "@/shared/model/polyline";
import { Polyline } from "react-kakao-maps-sdk";

type Props = MapPolylineInterface;

export function KakaoPolylineAdapter(props: Props) {
    return (
        <Polyline
            path={props.path}
            strokeWeight={props.strokeWeight}
            strokeColor={props.strokeColor}
            strokeOpacity={props.strokeOpacity}
            strokeStyle={props.strokeStyle}
            zIndex={props.zIndex}
            onClick={() => props.onClick?.()}
        />
    );
}
