import { useState } from "react";

import { Button } from "@/shared/components/Button/Button";

export function SearchStationNamePage() {
    const [stationName, setStationName] = useState("");

    return (
        <form
            className="flex min-h-0 flex-1 flex-row gap-2 px-4 py-6"
            onSubmit={(event) => {
                event.preventDefault();
            }}
        >
            <input
                type="search"
                value={stationName}
                onChange={(event) => setStationName(event.target.value)}
                placeholder="주유소명을 입력해주세요"
                aria-label="주유소명"
                className="h-14 min-w-0 flex-1 rounded-lg bg-gil-gray-850 px-4 text-gil-light-text outline-none placeholder:text-gil-gray-600 focus:ring-2 focus:ring-gil-primary"
            />
            <Button type="submit" className="shrink-0">
                검색
            </Button>
        </form>
    );
}
