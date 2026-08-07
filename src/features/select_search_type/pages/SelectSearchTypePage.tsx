import { useState } from "react";
import type { Station } from "@/shared/types/map";
import { SelectTypeStep } from "@/features/select_search_type/components/SelectTypeStep";
import { DrawPathStep } from "@/features/select_search_type/components/DrawPathStep";
import { useKakaoLoader } from "react-kakao-maps-sdk";

export function SelectSearchTypePage() {
    const [currentStep, setCurrentStep] = useState(1);

    // 2단계에서 받아온 주유소 목록을 저장할 State
    const [foundStations, setFoundStations] = useState<Station[] | null>(null);

    const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, 2));

    const handlePathSubmit = (stations: Station[]) => {
        setFoundStations(stations);
    };

    const [loading, error] = useKakaoLoader({
        appkey: import.meta.env.VITE_KAKAO_APP_KEY,
    });

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {!loading && !error && (
                <>
                    {currentStep === 1 && <SelectTypeStep onNext={handleNext} />}
                    {currentStep === 2 && (
                        <DrawPathStep
                            stations={foundStations}
                            onNext={handlePathSubmit}
                            onResultClear={() => setFoundStations(null)}
                        />
                    )}
                </>
            )}
        </div>
    );
}
