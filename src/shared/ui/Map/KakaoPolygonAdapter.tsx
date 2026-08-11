import type { LatLng } from "@/shared/model/map";
import type { MapPolygonInterface } from "@/shared/model/polygon";
import { Polygon } from "react-kakao-maps-sdk";

type Props = MapPolygonInterface;

function toLatLng(mouseEvent: kakao.maps.event.MouseEvent): LatLng {
    return {
        lat: mouseEvent.latLng.getLat(),
        lng: mouseEvent.latLng.getLng(),
    };
}

export function KakaoPolygonAdapter(props: Props) {
    return (
        <Polygon
            path={props.path}
            strokeWeight={props.strokeWeight}
            strokeColor={props.strokeColor}
            strokeOpacity={props.strokeOpacity}
            strokeStyle={props.strokeStyle}
            fillColor={props.fillColor}
            fillOpacity={props.fillOpacity}
            zIndex={props.zIndex}
            onClick={(_, mouseEvent) => props.onClick?.(toLatLng(mouseEvent))}
            onMousedown={(_, mouseEvent) => props.onMouseDown?.(toLatLng(mouseEvent))}
            onMousemove={(_, mouseEvent) => props.onMouseMove?.(toLatLng(mouseEvent))}
        />
    );
}
