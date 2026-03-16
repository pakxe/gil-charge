import { useState } from "react";
import { Progress } from "@/shared/components/Progress/Progress";
import { Station } from "@/shared/types/map";
import { SelectTypeStep } from "@/features/select_search_type/components/SelectTypeStep";
import { DrawPathStep } from "@/features/select_search_type/components/DrawPathStep";
import { ConfirmStep } from "@/features/select_search_type/components/ConfirmStep";
import { useKakaoLoader } from "react-kakao-maps-sdk";

export function SelectSearchTypePage() {
    const [currentStep, setCurrentStep] = useState(1);

    // 2단계에서 받아온 주유소 목록을 저장할 State
    const [foundStations, setFoundStations] = useState<Station[]>([]);

    const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, 3));
    const handlePrev = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    // 2단계 -> 3단계 전용 핸들러 (데이터 넘겨받기)
    const handlePathSubmit = (stations: Station[]) => {
        setFoundStations(stations);
        handleNext();
    };

    const [loading, error] = useKakaoLoader({
        appkey: import.meta.env.VITE_KAKAO_APP_KEY,
    });

    return (
        <div className="flex flex-col gap-8">
            <Progress value={currentStep} max={3} onPrev={handlePrev} onNext={handleNext} />

            {loading && <div className="text-center py-10">지도를 불러오는 중입니다...</div>}

            {!loading && !error && (
                <>
                    {currentStep === 1 && <SelectTypeStep onNext={handleNext} />}
                    {currentStep === 2 && <DrawPathStep onNext={handlePathSubmit} />}
                    {currentStep === 3 && <ConfirmStep stations={foundStations} onPrev={handlePrev} />}
                </>
            )}
        </div>
    );
}
