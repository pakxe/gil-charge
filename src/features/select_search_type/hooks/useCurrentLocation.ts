import { LatLng } from "@/shared/types/map";
import { useState } from "react";

type AcceptStatus = "idle" | "loading" | "granted" | "denied" | "error" | "unavailable";

type RequestOptions = {
    onSuccess?: (location: LatLng) => void;
    onError?: (error: GeolocationPositionError) => void;
    onFinally?: () => void;
};

const GEOLOCATION_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 5 * 1000,
    maximumAge: 1000 * 60 * 5, // 5분
};

export function useCurrentLocation() {
    const [location, setLocation] = useState<LatLng | null>(null);
    const [acceptStatus, setAcceptStatus] = useState<AcceptStatus>(isGeolocationSupported() ? "idle" : "unavailable");

    function requestLocation({ onSuccess, onFinally, onError }: RequestOptions) {
        if (!isGeolocationSupported()) {
            setAcceptStatus("unavailable");

            return;
        }

        setAcceptStatus("loading");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                handleRequestLocationSuccess({ position, onSuccess });
                onFinally?.();
            },
            (error) => {
                handleRequestLocationError({ error, onError });
                onFinally?.();
            },
            GEOLOCATION_OPTIONS,
        );
    }

    function handleRequestLocationSuccess({
        position,
        onSuccess,
    }: Pick<RequestOptions, "onSuccess"> & { position: GeolocationPosition }) {
        const newLocation: LatLng = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
        };

        setLocation(newLocation);
        setAcceptStatus("granted");

        onSuccess?.(newLocation);
    }

    function handleRequestLocationError({
        error,
        onError,
    }: Pick<RequestOptions, "onError"> & { error: GeolocationPositionError }) {
        if (error.code === error.PERMISSION_DENIED) {
            setAcceptStatus("denied");
            return;
        }

        setAcceptStatus("error");

        onError?.(error);
    }

    return {
        location,
        locationAcceptStatus: acceptStatus,

        requestLocation,
    };
}

function isGeolocationSupported() {
    return typeof navigator !== "undefined" && navigator.geolocation !== undefined;
}
