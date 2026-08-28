import { Top } from "@/shared/ui/Top/Top";

const SEARCH_TYPES = [
    {
        id: "search-station-by-path",
        title: "웨이포인트 그려서 주유소 찾기",
        description: "",
    },
    {
        id: "search-station-by-name",
        title: "주유소 검색하기",
        description: "",
    },
] as const;

export type SearchTypeId = (typeof SEARCH_TYPES)[number]["id"];

type Props = {
    onSelect: (searchTypeId: SearchTypeId) => void;
};

export function SelectTypeStep({ onSelect }: Props) {
    return (
        <div className="flex flex-col gap-8 py-6 px-4">
            <Top
                title={<p className="typo-title-bold">길충전</p>}
                description={<p className="typo-content-medium text-gil-sub-text">원하시는 서비스를 선택해주세요.</p>}
            />

            <div className="flex flex-col gap-2">
                {SEARCH_TYPES.map(({ id, title, description }) => (
                    <button
                        type="button"
                        key={id}
                        onClick={() => onSelect(id)}
                        className="min-h-10 w-full rounded-[50px] bg-[#1f1f1f]/40 px-6 py-4 text-left text-gil-light-text backdrop-blur-[15px]"
                    >
                        <span className="flex flex-col gap-2">
                            <span>{title}</span>
                            {description && (
                                <span className="typo-content-medium text-gil-sub-text">{description}</span>
                            )}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
