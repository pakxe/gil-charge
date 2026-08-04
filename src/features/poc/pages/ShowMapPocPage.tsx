import { LatLng } from "@/shared/model/map";
import { Map } from "@/shared/ui/Map/Map";

const INITIAL_POSITION: LatLng = { lat: 33.450701, lng: 126.57066 };

export function ShowMapPocPage() {
    return (
        <Map
            center={INITIAL_POSITION}
            loadingFallback={<div>loading</div>}
            errorFallback={<div>error</div>}
            className="w-full h-full min-h-[300px] min-w-[300px]"
        >
            <Map.CustomOverlay position={INITIAL_POSITION}>
                <div>안녕</div>
            </Map.CustomOverlay>
            <Map.Polyline path={[INITIAL_POSITION, { lat: INITIAL_POSITION.lat, lng: INITIAL_POSITION.lng - 4 }]} />
        </Map>
    );
}
