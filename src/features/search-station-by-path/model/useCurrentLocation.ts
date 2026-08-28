import { LatLng } from "@/shared/types/map";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    type CurrentLocationEvent,
    type CurrentLocationStatus,
    getNextCurrentLocationStatus,
    shouldRenderLocationUpdate,
} from "@/features/search-station-by-path/model/currentLocation";

export type { CurrentLocationStatus } from "@/features/search-station-by-path/model/currentLocation";

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

export function useCurrentLocation({
    onCenterLocation,
    onBlocked,
    onInitialError,
    onStale,
    onUnavailable,
}: CurrentLocationEventHandlers = {}) {
    const [location, setLocation] = useState<LatLng | null>(null);
    const [status, setStatus] = useState<CurrentLocationStatus>(isGeolocationSupported() ? "idle" : "unavailable");

    const statusRef = useRef<CurrentLocationStatus>(status);
    const watcherIdRef = useRef<number | null>(null);
    const locationRef = useRef<LatLng | null>(null);
    const lastRenderedRef = useRef<{ location: LatLng | null; at: number }>({
        location: null,
        at: 0,
    });
    const hasUserStartedTrackingRef = useRef(false);
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

    const transitionStatus = useCallback((event: CurrentLocationEvent) => {
        const currentStatus = statusRef.current;
        const nextStatus = getNextCurrentLocationStatus(currentStatus, event);

        statusRef.current = nextStatus;
        setStatus(nextStatus);

        return { currentStatus, nextStatus };
    }, []);

    const handlePositionSuccess = useCallback(
        (position: GeolocationPosition) => {
            const nextLocation: LatLng = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };
            const isFirstPosition = locationRef.current === null;
            const now = Date.now();
            const shouldRender = shouldRenderLocationUpdate(
                {
                    lastRenderedLocation: lastRenderedRef.current.location,
                    lastRenderedAt: lastRenderedRef.current.at,
                },
                nextLocation,
                now,
            );

            locationRef.current = nextLocation;
            transitionStatus({ type: "success" });

            if (shouldRender) {
                lastRenderedRef.current = {
                    location: nextLocation,
                    at: now,
                };
                setLocation(nextLocation);
            }

            if (isFirstPosition) {
                handlersRef.current.onCenterLocation?.(nextLocation);
            }
        },
        [transitionStatus],
    );

    const handlePositionError = useCallback(
        (error: GeolocationPositionError) => {
            if (error.code === error.PERMISSION_DENIED) {
                clearWatcher();
                hasUserStartedTrackingRef.current = false;
                locationRef.current = null;
                lastRenderedRef.current = {
                    location: null,
                    at: 0,
                };
                setLocation(null);
                transitionStatus({ type: "permissionDenied" });
                handlersRef.current.onBlocked?.();
                return;
            }

            if (!locationRef.current) {
                clearWatcher();
                hasUserStartedTrackingRef.current = false;
                transitionStatus({ type: "initialFailure" });
                handlersRef.current.onInitialError?.();
                return;
            }

            const { currentStatus, nextStatus } = transitionStatus({ type: "trackingFailure" });

            if (currentStatus !== "stale" && nextStatus === "stale") {
                handlersRef.current.onStale?.();
            }
        },
        [clearWatcher, transitionStatus],
    );

    const startWatcher = useCallback(() => {
        if (!isGeolocationSupported()) {
            transitionStatus({ type: "unavailable" });
            handlersRef.current.onUnavailable?.();
            return;
        }

        if (watcherIdRef.current !== null) {
            return;
        }

        transitionStatus({ type: "request" });
        watcherIdRef.current = navigator.geolocation.watchPosition(
            handlePositionSuccess,
            handlePositionError,
            GEOLOCATION_OPTIONS,
        );
    }, [handlePositionError, handlePositionSuccess, transitionStatus]);

    const requestCurrentLocation = useCallback(() => {
        if (!isGeolocationSupported()) {
            transitionStatus({ type: "unavailable" });
            handlersRef.current.onUnavailable?.();
            return;
        }

        hasUserStartedTrackingRef.current = true;

        if (locationRef.current) {
            handlersRef.current.onCenterLocation?.(locationRef.current);
        }

        startWatcher();
    }, [startWatcher, transitionStatus]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!hasUserStartedTrackingRef.current) {
                return;
            }

            if (document.visibilityState === "hidden") {
                clearWatcher();
                transitionStatus({ type: "pause" });
                return;
            }

            transitionStatus({ type: "resume" });
            startWatcher();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            clearWatcher();
        };
    }, [clearWatcher, startWatcher, transitionStatus]);

    return {
        location,
        status,
        requestCurrentLocation,
    };
}

function isGeolocationSupported() {
    return typeof navigator !== "undefined" && navigator.geolocation !== undefined;
}
