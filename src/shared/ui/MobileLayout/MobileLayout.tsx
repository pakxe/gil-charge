import { Outlet } from "react-router";

export function MobileLayout() {
    return (
        <div className="min-h-dvh bg-gil-gray-850 text-gil-light-text">
            <div className="relative mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden bg-gil-bg">
                <Outlet />
            </div>
        </div>
    );
}
