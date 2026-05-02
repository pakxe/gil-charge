import { useState } from "react";
import Box from "@/shared/components/Box/Box";
import { Top } from "@/shared/components/Top/Top";
import { Station } from "@/shared/types/map";

export function ConfirmStep({ stations, onPrev }: { stations: Station[]; onPrev: () => void }) {
    const [localCurrencyOnly, setLocalCurrencyOnly] = useState(false);
    const acceptedStationCount = stations.filter((station) => station.localCurrency?.accepted === true).length;
    const filteredStations = localCurrencyOnly
        ? stations.filter((station) => station.localCurrency?.accepted === true)
        : stations;
    const visibleStations = [...filteredStations].sort((a, b) => a.price - b.price);

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4 pb-12">
            <div className="flex-none">
                <Top
                    title={<p className="typo-title-bold">탐색 결과</p>}
                    description={
                        <p className="typo-content-medium text-gil-sub-text">
                            지정하신 영역 내 총 {stations.length}개의 주유소를 찾았습니다.
                        </p>
                    }
                />
            </div>

            <div className="flex flex-none items-center justify-between gap-3 rounded-lg bg-gil-gray-850  p-3">
                <div className="min-w-0">
                    <p className="text-content font-bold">지역화폐 가능만 보기</p>
                    <p className="text-sub text-gil-sub-text">
                        {localCurrencyOnly
                            ? `${acceptedStationCount}개만 표시 중`
                            : `가능 주유소 ${acceptedStationCount}개`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setLocalCurrencyOnly((prev) => !prev)}
                    aria-pressed={localCurrencyOnly}
                    className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
                        localCurrencyOnly ? "bg-yellow-500" : "bg-gray-700"
                    }`}
                >
                    <span
                        className={`absolute left-0 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                            localCurrencyOnly ? "translate-x-7" : "translate-x-1"
                        }`}
                    />
                </button>
            </div>

            <div className="w-full border-t border-gil-gray-800" />
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:display-none">
                {visibleStations.length === 0 ? (
                    <Box className="p-5 border rounded-lg">
                        <p className="text-content text-gil-sub-text">
                            조건에 맞는 주유소가 없습니다. 지역화폐 필터를 해제하거나 다시 검색해보세요.
                        </p>
                    </Box>
                ) : (
                    visibleStations.map((station) => (
                        <Box key={station.id} className="p-4 border-none rounded-lg flex flex-col justify-start">
                            <div className="w-full flex justify-between">
                                <span className="truncate min-w-0">{station.name}</span>
                                <span className="text-yellow-600 font-bold shrink-0 whitespace-nowrap">
                                    {station.price.toLocaleString()}원
                                </span>
                            </div>
                            <div className="flex justify-between w-full items-center">
                                <span className="text-content">
                                    {station.localCurrency.roadAddress ?? "주소 정보 없음"}
                                </span>
                            </div>
                            {station.localCurrency.accepted && (
                                <div className="flex justify-end w-full">
                                    <div className="shrink-0 whitespace-nowrap text-sub text-gil-dark-text font-bold bg-yellow-600 py-0.5 px-2 rounded-full">
                                        지역화폐 허용
                                    </div>
                                </div>
                            )}
                        </Box>
                    ))
                )}
            </div>

            <button onClick={onPrev} className="flex-none p-3 bg-gray-800 rounded-lg font-bold">
                다시 그리기
            </button>
        </div>
    );
}
