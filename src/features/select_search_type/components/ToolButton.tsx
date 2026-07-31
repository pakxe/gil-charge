import { cn } from "@/shared/utils/cn";

interface ToolButtonProps {
    isActive: boolean;
    icon: string;
    onClick: () => void;
}

export function ToolButton({ isActive, icon, onClick }: ToolButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "p-2 rounded-full transition-colors",
                isActive ? "bg-yellow-500 text-black" : "text-gray-400 hover:text-white",
            )}
        >
            {icon}
        </button>
    );
}
