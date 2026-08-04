import { MapMarkerInterface } from "@/shared/model/marker";
import { CustomOverlayMap } from "react-kakao-maps-sdk";

type Props = MapMarkerInterface;
export function KakaoMarkerAdapter(props: Props) {
    return <CustomOverlayMap position={props.position}>{props.children}</CustomOverlayMap>;
}
