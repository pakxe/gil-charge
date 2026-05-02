import Box from "@/shared/components/Box/Box";
import { Top } from "@/shared/components/Top/Top";
import { Station } from "@/shared/types/map";

export function ConfirmStep({ stations, onPrev }: { stations: Station[]; onPrev: () => void }) {
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

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:display-none">
                {stations
                    .sort((a, b) => a.price - b.price)
                    .map((station) => (
                        <Box
                            key={station.id}
                            className="p-4 border border-gray-200 rounded-lg flex flex-col justify-start"
                        >
                            <div className="w-full flex justify-between">
                                <span className="truncate min-w-0">{station.name}</span>
                                <span className="text-yellow-600 font-bold shrink-0 whitespace-nowrap">
                                    {station.price.toLocaleString()}원
                                </span>
                            </div>
                            <div className="flex justify-between w-full items-center">
                                <span className="text-content">{station.localCurrency.roadAddress}</span>
                            </div>
                            {station.localCurrency.accepted && (
                                <div className="flex justify-end w-full">
                                    <div className="shrink-0 whitespace-nowrap text-sub text-gil-dark-text font-bold bg-yellow-600 py-0.5 px-2 rounded-full">
                                        지역화폐 허용
                                    </div>
                                </div>
                            )}
                        </Box>
                    ))}
            </div>

            <button onClick={onPrev} className="flex-none p-3 bg-gray-800 rounded-lg font-bold">
                다시 그리기
            </button>
        </div>
    );
}
