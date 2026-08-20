import { Button } from "@/shared/components/Button/Button";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner/LoadingSpinner";

export function MapLoadingFallback() {
    return (
        <div className="absolute inset-0 z-[90] flex flex-col items-center justify-center bg-black/60 px-6 text-center text-gil-light-text backdrop-blur-sm">
            <LoadingSpinner className="size-10 border-4 text-gil-primary" label="지도 로딩 중" />
            <p className="mt-4 text-body font-bold">지도를 준비 중...</p>
        </div>
    );
}

type MapErrorFallbackProps = {
    message: string;
    description: string;
    onRetry: () => void;
};

export function MapErrorFallback({ message, description, onRetry }: MapErrorFallbackProps) {
    return (
        <div className="absolute inset-0 z-[90] flex items-center justify-center bg-gil-gray-950 px-6 text-center text-gil-light-text">
            <section className="flex w-full max-w-xs flex-col items-center">
                <p className="text-section font-black">{message}</p>
                <p className="mt-3 text-content font-medium leading-6 text-gil-gray-500">{description}</p>
                <Button className="mt-6" corner="semiRounded" size="sm" type="button" onClick={onRetry}>
                    새로고침
                </Button>
            </section>
        </div>
    );
}
