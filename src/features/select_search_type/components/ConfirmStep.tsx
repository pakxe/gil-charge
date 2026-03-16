import Box from "@/shared/components/Box/Box";
import { Top } from "@/shared/components/Top/Top";
import { Station } from "@/shared/types/map";

export function ConfirmStep({ stations, onPrev }: { stations: Station[]; onPrev: () => void }) {
    return (
        <div className="flex flex-col gap-4">
            <Top
                title={<p className="typo-title-bold">탐색 결과</p>}
                description={
                    <p className="typo-content-medium text-gil-sub-text">
                        지정하신 영역 내 총 {stations.length}개의 주유소를 찾았습니다.
                    </p>
                }
            />

            <div className="flex flex-col gap-2 max-h-100 overflow-y-auto px-4">
                {stations
                    .sort((a, b) => a.price - b.price)
                    .map((station) => (
                        <Box key={station.id} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="font-bold">{station.name}</span>
                                <span className="text-yellow-600 font-bold">{station.price.toLocaleString()}원</span>
                            </div>
                        </Box>
                    ))}
            </div>

            <button onClick={onPrev} className="mt-4 p-3 bg-gray-200 rounded-lg font-bold">
                다시 그리기
            </button>
        </div>
    );
}
