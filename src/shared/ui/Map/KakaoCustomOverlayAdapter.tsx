import { MapCustomOverlayInterface } from "@/shared/model/customOverlay";
import { CustomOverlayMap } from "react-kakao-maps-sdk";

type Props = MapCustomOverlayInterface;

export function KakaoCustomOverlayAdapter(props: Props) {
    return (
        <CustomOverlayMap
            position={props.position}
            clickable={props.clickable}
            xAnchor={props.xAnchor}
            yAnchor={props.yAnchor}
            zIndex={props.zIndex}
        >
            {props.children}
        </CustomOverlayMap>
    );
}
