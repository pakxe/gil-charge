import { Button } from "@/shared/ui/Button/Button";
import { cn } from "@/shared/utils/cn";
import { cva, VariantProps } from "class-variance-authority";

type Props = VariantProps<typeof style> & {
    value: number;
    max: number;
    onPrev?: () => void;
    onNext?: () => void;
};

export function Progress({ variant = "glass", value, max, onPrev, onNext }: Props) {
    const progressArr = Array.from({ length: max }, (_, i) => i < value);

    const isFirstStep = value <= 1;
    const isLastStep = value >= max;

    return (
        <div className={cn(style({ variant }))}>
            {/* 첫 번째 스텝이면 버튼 비활성화 */}
            <Button variant={isFirstStep ? "disabled" : "tertiary"} size="xs" onClick={onPrev} disabled={isFirstStep}>
                이전
            </Button>

            {progressArr.map((isActive, index) => (
                <div
                    key={index} // 리액트 key 에러 방지용 추가
                    className={cn("h-1.5 w-full rounded-full", isActive ? "bg-gil-primary" : "bg-gil-gray-800")}
                />
            ))}

            {/* 마지막 스텝이면 버튼 비활성화 (기존 하드코딩된 disabled를 동적으로 변경) */}
            <Button variant={isLastStep ? "disabled" : "tertiary"} size="xs" onClick={onNext} disabled={isLastStep}>
                이후
            </Button>
        </div>
    );
}

const style = cva("flex-none rounded-full flex flex-row justify-between items-center gap-2.5", {
    variants: {
        variant: {
            glass: "shadow-lg backdrop-blur-md bg-gil-bg/60",
            transparent: "bg-transparent",
        },
    },
});
