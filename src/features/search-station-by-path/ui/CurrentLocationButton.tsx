import type { CurrentLocationStatus } from "@/features/search-station-by-path/model/useCurrentLocation";
import { cn } from "@/shared/lib/cn";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner/LoadingSpinner";

type CurrentLocationButtonProps = {
    status: CurrentLocationStatus;
    onClick: () => void;
};

export function CurrentLocationButton({ status, onClick }: CurrentLocationButtonProps) {
    return (
        <button
            type="button"
            aria-label="현재 위치로 이동"
            aria-busy={status === "locating"}
            className={cn(
                "absolute left-4 top-16 z-60 flex h-11 min-w-11 items-center justify-center rounded-full border border-white/20 px-3 text-xs font-bold shadow-lg backdrop-blur-[15px] transition-colors",
                getCurrentLocationButtonClassName(status),
            )}
            onClick={onClick}
        >
            {status === "locating" ? (
                <LoadingSpinner className="size-4" label="현재 위치 확인 중" />
            ) : (
                getCurrentLocationButtonLabel(status)
            )}
        </button>
    );
}

function getCurrentLocationButtonLabel(status: CurrentLocationStatus) {
    switch (status) {
        case "locating":
            return "확인 중";
        case "tracking":
            return "현위치";
        case "stale":
            return "이전 위치";
        case "blocked":
            return "권한 필요";
        case "paused":
            return "일시 정지";
        case "unavailable":
            return "사용 불가";
        case "idle":
        default:
            return "현위치";
    }
}

function getCurrentLocationButtonClassName(status: CurrentLocationStatus) {
    switch (status) {
        case "locating":
            return "bg-gil-yellow-400 text-gil-brown-900";
        case "tracking":
            return "bg-blue-500 text-white";
        case "stale":
        case "paused":
            return "bg-gil-gray-850/90 text-gil-light-text";
        case "blocked":
        case "unavailable":
            return "bg-gil-gray-850/90 text-gil-gray-500";
        case "idle":
        default:
            return "bg-[#1f1f1f]/40 text-white";
    }
}
