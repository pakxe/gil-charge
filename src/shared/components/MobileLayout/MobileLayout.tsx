import { Outlet } from "react-router";

export function MobileLayout() {
    return (
        <div className="min-h-screen bg-gil-gray-850 text-gil-light-text">
            <div className="relative w-full max-w-md mx-auto min-h-screen bg-gil-bg overflow-hidden px-4.5 pt-7.5">
                <Outlet />
            </div>
        </div>
    );
}
