import Box from "@/shared/components/Box/Box";
import { Top } from "@/shared/components/Top/Top";

const SEARCH_TYPES = [
    // {
    //     title: "1. 지도를 움직여 정하기",
    //     description: "설명설명...",
    // },
    {
        title: "2. 지도에 그려서 정하기",
        description: "설명설명...",
    },
    // {
    //     title: "3. 현재 위치로 정하기",
    //     description: "설명설명...",
    // },
] as const;

export function SelectTypeStep({ onNext }: { onNext: () => void }) {
    return (
        <div className="flex flex-col gap-8">
            <Top
                title={<p className="typo-title-bold">어떻게 위치를 정할까요?</p>}
                description={<p className="typo-content-medium text-gil-sub-text">원하시는 방식을 선택해주세요.</p>}
            />

            <div className="flex flex-col gap-2">
                {SEARCH_TYPES.map(({ title, description }) => (
                    <div key={title} onClick={onNext} className="cursor-pointer">
                        <Box className="px-6">
                            <Box.Content>
                                <Box.ContentRow>{title}</Box.ContentRow>
                                <Box.ContentRow>{description}</Box.ContentRow>
                            </Box.Content>
                        </Box>
                    </div>
                ))}
            </div>
        </div>
    );
}
