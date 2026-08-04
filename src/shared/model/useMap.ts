import { useSyncExternalStore } from "react";
import { MapInstance } from "@/shared/model/map";

// 1. 실제 지도 인스턴스와 상태 변경을 감지할 구독(Listener) 목록
let mapInstance: MapInstance | null = null;
const listeners = new Set<() => void>();

// 2. 지도 등록/해제용 setter
export function setMap(map: MapInstance | null) {
    mapInstance = map;
    listeners.forEach((listener) => listener()); // 등록된 컴포넌트들에 상태 변경 알림
}

// 3. React가 상태 변화를 구독하고Snapshot을 가져오기 위한 함수들
const subscribe = (listener: () => void) => {
    listeners.add(listener);

    return () => listeners.delete(listener); // cleanup
};

const getSnapshot = () => mapInstance;

// 4. 컴포넌트에서 호출할 Hook
export function useMap(): MapInstance | null {
    return useSyncExternalStore(subscribe, getSnapshot);
}
