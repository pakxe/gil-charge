// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCurrentLocation } from "@/features/search-station-by-path/model/useCurrentLocation";

type WatchSuccess = PositionCallback;
type WatchError = PositionErrorCallback;

const watchPositionMock = vi.fn();
const clearWatchMock = vi.fn();

let watchCallbacks: Array<{ success: WatchSuccess; error: WatchError }> = [];
let nextWatcherId = 1;

beforeEach(() => {
    watchCallbacks = [];
    nextWatcherId = 1;

    watchPositionMock.mockImplementation((success: WatchSuccess, error: WatchError) => {
        watchCallbacks.push({ success, error });
        const watcherId = nextWatcherId;
        nextWatcherId += 1;
        return watcherId;
    });

    Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
            watchPosition: watchPositionMock,
            clearWatch: clearWatchMock,
        },
    });

    setVisibilityState("visible");
    vi.useFakeTimers();
    vi.setSystemTime(0);
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe("useCurrentLocation", () => {
    it("현재 위치 요청 시 watchPosition을 시작하고 첫 위치를 표시하며 한 번만 중심 이동을 요청한다", () => {
        const onCenterLocation = vi.fn();
        const { result } = renderHook(() => useCurrentLocation({ onCenterLocation }));

        act(() => {
            result.current.requestCurrentLocation();
        });

        expect(result.current.status).toBe("locating");
        expect(watchPositionMock).toHaveBeenCalledTimes(1);

        const firstLocation = { lat: 37.5665, lng: 126.978 };
        act(() => {
            emitSuccess(0, firstLocation);
        });

        expect(result.current.status).toBe("tracking");
        expect(result.current.location).toEqual(firstLocation);
        expect(onCenterLocation).toHaveBeenCalledTimes(1);
        expect(onCenterLocation).toHaveBeenLastCalledWith(firstLocation);

        vi.setSystemTime(3_000);
        act(() => {
            emitSuccess(0, { lat: 37.5666, lng: 126.978 });
        });

        expect(onCenterLocation).toHaveBeenCalledTimes(1);
    });

    it("이미 위치가 있으면 버튼 클릭 시 새 watcher를 만들지 않고 현재 위치로 한 번 중심 이동한다", () => {
        const onCenterLocation = vi.fn();
        const { result } = renderHook(() => useCurrentLocation({ onCenterLocation }));

        act(() => {
            result.current.requestCurrentLocation();
            emitSuccess(0, { lat: 37.5665, lng: 126.978 });
        });
        onCenterLocation.mockClear();

        act(() => {
            result.current.requestCurrentLocation();
        });

        expect(watchPositionMock).toHaveBeenCalledTimes(1);
        expect(onCenterLocation).toHaveBeenCalledTimes(1);
        expect(onCenterLocation).toHaveBeenLastCalledWith({ lat: 37.5665, lng: 126.978 });
    });

    it("2초와 5m 조건을 만족하지 않는 위치 갱신은 화면 location에 반영하지 않는다", () => {
        const { result } = renderHook(() => useCurrentLocation());

        act(() => {
            result.current.requestCurrentLocation();
            emitSuccess(0, { lat: 37.5665, lng: 126.978 });
        });

        vi.setSystemTime(1_000);
        act(() => {
            emitSuccess(0, { lat: 37.5667, lng: 126.978 });
        });
        expect(result.current.location).toEqual({ lat: 37.5665, lng: 126.978 });

        vi.setSystemTime(3_000);
        act(() => {
            emitSuccess(0, { lat: 37.56653, lng: 126.978 });
        });
        expect(result.current.location).toEqual({ lat: 37.5665, lng: 126.978 });

        act(() => {
            emitSuccess(0, { lat: 37.5666, lng: 126.978 });
        });
        expect(result.current.location).toEqual({ lat: 37.5666, lng: 126.978 });
    });

    it("권한 거부 시 blocked가 되고 watcher와 마커 상태를 정리한다", () => {
        const onBlocked = vi.fn();
        const { result } = renderHook(() => useCurrentLocation({ onBlocked }));

        act(() => {
            result.current.requestCurrentLocation();
            emitSuccess(0, { lat: 37.5665, lng: 126.978 });
        });

        act(() => {
            emitError(0, createGeolocationError(1));
        });

        expect(result.current.status).toBe("blocked");
        expect(result.current.location).toBeNull();
        expect(clearWatchMock).toHaveBeenCalledWith(1);
        expect(onBlocked).toHaveBeenCalledTimes(1);
    });

    it("첫 위치 획득 전에 timeout이 발생하면 idle로 돌아가고 실패 콜백을 호출한다", () => {
        const onInitialError = vi.fn();
        const { result } = renderHook(() => useCurrentLocation({ onInitialError }));

        act(() => {
            result.current.requestCurrentLocation();
        });

        act(() => {
            emitError(0, createGeolocationError(3));
        });

        expect(result.current.status).toBe("idle");
        expect(result.current.location).toBeNull();
        expect(clearWatchMock).toHaveBeenCalledWith(1);
        expect(onInitialError).toHaveBeenCalledTimes(1);
    });

    it("추적 중 위치 획득 실패는 stale로 전이하고 마지막 위치를 유지한다", () => {
        const onStale = vi.fn();
        const { result } = renderHook(() => useCurrentLocation({ onStale }));

        act(() => {
            result.current.requestCurrentLocation();
            emitSuccess(0, { lat: 37.5665, lng: 126.978 });
        });

        act(() => {
            emitError(0, createGeolocationError(2));
        });

        expect(result.current.status).toBe("stale");
        expect(result.current.location).toEqual({ lat: 37.5665, lng: 126.978 });
        expect(clearWatchMock).not.toHaveBeenCalled();
        expect(onStale).toHaveBeenCalledTimes(1);
    });

    it("stale 상태 진입 시 한 번 알리고 정상화 후 다시 stale이 되면 다시 알린다", () => {
        const onStale = vi.fn();
        const { result } = renderHook(() => useCurrentLocation({ onStale }));

        act(() => {
            result.current.requestCurrentLocation();
            emitSuccess(0, { lat: 37.5665, lng: 126.978 });
        });

        act(() => {
            emitError(0, createGeolocationError(2));
            emitError(0, createGeolocationError(2));
        });

        expect(result.current.status).toBe("stale");
        expect(onStale).toHaveBeenCalledTimes(1);

        act(() => {
            emitSuccess(0, { lat: 37.5666, lng: 126.978 });
        });

        expect(result.current.status).toBe("tracking");

        act(() => {
            emitError(0, createGeolocationError(2));
        });

        expect(result.current.status).toBe("stale");
        expect(onStale).toHaveBeenCalledTimes(2);
    });

    it("visibilitychange에 따라 watcher를 정리하고 다시 생성한다", () => {
        const { result } = renderHook(() => useCurrentLocation());

        act(() => {
            result.current.requestCurrentLocation();
            emitSuccess(0, { lat: 37.5665, lng: 126.978 });
        });

        act(() => {
            setVisibilityState("hidden");
            document.dispatchEvent(new Event("visibilitychange"));
        });

        expect(result.current.status).toBe("paused");
        expect(clearWatchMock).toHaveBeenCalledWith(1);

        act(() => {
            setVisibilityState("visible");
            document.dispatchEvent(new Event("visibilitychange"));
        });

        expect(result.current.status).toBe("tracking");
        expect(watchPositionMock).toHaveBeenCalledTimes(2);
    });

    it("unmount 시 active watcher를 정리한다", () => {
        const { result, unmount } = renderHook(() => useCurrentLocation());

        act(() => {
            result.current.requestCurrentLocation();
        });

        unmount();

        expect(clearWatchMock).toHaveBeenCalledWith(1);
    });
});

function emitSuccess(index: number, location: { lat: number; lng: number }) {
    getWatchCallbacks(index).success({
        coords: {
            latitude: location.lat,
            longitude: location.lng,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
    });
}

function emitError(index: number, error: GeolocationPositionError) {
    getWatchCallbacks(index).error(error);
}

function getWatchCallbacks(index: number) {
    const callbacks = watchCallbacks[index];

    if (!callbacks) {
        throw new Error(`${index + 1}번째 위치 watcher가 없습니다.`);
    }

    return callbacks;
}

function createGeolocationError(code: number): GeolocationPositionError {
    return {
        code,
        message: "geolocation error",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
    } as GeolocationPositionError;
}

function setVisibilityState(visibilityState: DocumentVisibilityState) {
    Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: visibilityState,
    });
}
