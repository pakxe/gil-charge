import { LatLng } from "@/shared/types/map";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    type CurrentLocationStatus,
    getNextCurrentLocationStatus,
    shouldRenderLocationUpdate,
} from "@/features/select_search_type/model/currentLocation";

export type { CurrentLocationStatus } from "@/features/select_search_type/model/currentLocation";

type CurrentLocationEventHandlers = {
    onCenterLocation?: (location: LatLng) => void;
    onBlocked?: () => void;
    onInitialError?: () => void;
    onStale?: () => void;
    onUnavailable?: () => void;
};

const GEOLOCATION_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 5 * 1000,
    maximumAge: 1000 * 60 * 5,
};

const STALE_TOAST_INTERVAL_MS = 10_000;

export function useCurrentLocation({
    onCenterLocation,
    onBlocked,
    onInitialError,
    onStale,
    onUnavailable,
}: CurrentLocationEventHandlers = {}) {
    const [location, setLocation] = useState<LatLng | null>(null);
    const [status, setStatus] = useState<CurrentLocationStatus>(isGeolocationSupported() ? "idle" : "unavailable");

    const watcherIdRef = useRef<number | null>(null);
    const locationRef = useRef<LatLng | null>(null);
    const lastRenderedLocationRef = useRef<LatLng | null>(null);
    const lastRenderedAtRef = useRef(0);
    const lastStaleToastAtRef = useRef(-STALE_TOAST_INTERVAL_MS);
    const hasReceivedPositionRef = useRef(false);
    const hasUserStartedTrackingRef = useRef(false);
    const shouldCenterOnNextPositionRef = useRef(false);
    const handlersRef = useRef<CurrentLocationEventHandlers>({});

    useEffect(() => {
        handlersRef.current = {
            onCenterLocation,
            onBlocked,
            onInitialError,
            onStale,
            onUnavailable,
        };
    }, [onBlocked, onCenterLocation, onInitialError, onStale, onUnavailable]);

    const clearWatcher = useCallback(() => {
        if (watcherIdRef.current === null || !isGeolocationSupported()) {
            watcherIdRef.current = null;
            return;
        }

        navigator.geolocation.clearWatch(watcherIdRef.current);
        watcherIdRef.current = null;
    }, []);

    const handlePositionSuccess = useCallback((position: GeolocationPosition) => {
        const nextLocation: LatLng = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
        };
        const now = Date.now();
        const shouldRender = shouldRenderLocationUpdate(
            {
                lastRenderedLocation: lastRenderedLocationRef.current,
                lastRenderedAt: lastRenderedAtRef.current,
            },
            nextLocation,
            now,
        );

        hasReceivedPositionRef.current = true;
        locationRef.current = nextLocation;
        setStatus((currentStatus) => getNextCurrentLocationStatus(currentStatus, { type: "success" }));

        if (shouldRender) {
            lastRenderedLocationRef.current = nextLocation;
            lastRenderedAtRef.current = now;
            setLocation(nextLocation);
        }

        if (shouldCenterOnNextPositionRef.current) {
            shouldCenterOnNextPositionRef.current = false;
            handlersRef.current.onCenterLocation?.(nextLocation);
        }
    }, []);

    const handlePositionError = useCallback(
        (error: GeolocationPositionError) => {
            if (error.code === error.PERMISSION_DENIED) {
                clearWatcher();
                hasUserStartedTrackingRef.current = false;
                shouldCenterOnNextPositionRef.current = false;
                hasReceivedPositionRef.current = false;
                locationRef.current = null;
                lastRenderedLocationRef.current = null;
                setLocation(null);
                setStatus((currentStatus) =>
                    getNextCurrentLocationStatus(currentStatus, { type: "permissionDenied" }),
                );
                handlersRef.current.onBlocked?.();
                return;
            }

            if (!hasReceivedPositionRef.current) {
                clearWatcher();
                hasUserStartedTrackingRef.current = false;
                shouldCenterOnNextPositionRef.current = false;
                setStatus((currentStatus) => getNextCurrentLocationStatus(currentStatus, { type: "initialFailure" }));
                handlersRef.current.onInitialError?.();
                return;
            }

            setStatus((currentStatus) => getNextCurrentLocationStatus(currentStatus, { type: "trackingFailure" }));

            const now = Date.now();
            if (now - lastStaleToastAtRef.current >= STALE_TOAST_INTERVAL_MS) {
                lastStaleToastAtRef.current = now;
                handlersRef.current.onStale?.();
            }
        },
        [clearWatcher],
    );

    const startWatcher = useCallback(() => {
        if (!isGeolocationSupported()) {
            setStatus((currentStatus) => getNextCurrentLocationStatus(currentStatus, { type: "unavailable" }));
            handlersRef.current.onUnavailable?.();
            return;
        }

        if (watcherIdRef.current !== null) {
            return;
        }

        setStatus((currentStatus) => getNextCurrentLocationStatus(currentStatus, { type: "request" }));
        watcherIdRef.current = navigator.geolocation.watchPosition(
            handlePositionSuccess,
            handlePositionError,
            GEOLOCATION_OPTIONS,
        );
    }, [handlePositionError, handlePositionSuccess]);

    const requestCurrentLocation = useCallback(() => {
        if (!isGeolocationSupported()) {
            setStatus((currentStatus) => getNextCurrentLocationStatus(currentStatus, { type: "unavailable" }));
            handlersRef.current.onUnavailable?.();
            return;
        }

        hasUserStartedTrackingRef.current = true;

        if (locationRef.current) {
            handlersRef.current.onCenterLocation?.(locationRef.current);
        } else {
            shouldCenterOnNextPositionRef.current = true;
        }

        startWatcher();
    }, [startWatcher]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!hasUserStartedTrackingRef.current) {
                return;
            }

            if (document.visibilityState === "hidden") {
                clearWatcher();
                setStatus((currentStatus) => getNextCurrentLocationStatus(currentStatus, { type: "pause" }));
                return;
            }

            setStatus((currentStatus) => getNextCurrentLocationStatus(currentStatus, { type: "resume" }));
            startWatcher();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            clearWatcher();
        };
    }, [clearWatcher, startWatcher]);

    return {
        location,
        status,
        requestCurrentLocation,
    };
}

function isGeolocationSupported() {
    return typeof navigator !== "undefined" && navigator.geolocation !== undefined;
}
