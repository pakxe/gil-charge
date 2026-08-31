import { useEffect, useRef, useState } from "react";

import type { Station } from "@/shared/types/map";
import { clamp, getResultSheetDefaultHeight } from "@/features/search-station-by-path/model/resultBottomSheet";

type Params = {
    hasSearchResult: boolean;
    stations: Station[] | null;
};

export function useSearchResultSheetLayout({ hasSearchResult, stations }: Params) {
    const searchOverlayRef = useRef<HTMLDivElement | null>(null);
    const [searchOverlayVisibleHeight, setSearchOverlayVisibleHeight] = useState(0);
    const [maxSearchSheetHeight, setMaxSearchSheetHeight] = useState(0);

    useEffect(() => {
        if (!hasSearchResult) return;

        const overlay = searchOverlayRef.current;
        if (!overlay) return;

        const initialMaxHeight = getResultSheetMaxHeight(overlay);

        setMaxSearchSheetHeight(initialMaxHeight);
        setSearchOverlayVisibleHeight(getResultSheetDefaultHeight(initialMaxHeight));

        const updateMaxHeight = () => {
            const nextMaxHeight = getResultSheetMaxHeight(overlay);

            setMaxSearchSheetHeight(nextMaxHeight);
            setSearchOverlayVisibleHeight((prev) => clamp(prev, 0, nextMaxHeight));
        };

        const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateMaxHeight);

        observer?.observe(overlay);

        return () => {
            observer?.disconnect();
        };
    }, [hasSearchResult, stations]);
    return {
        searchOverlayRef,
        searchOverlayVisibleHeight,
        maxSearchSheetHeight,
        setSearchOverlayVisibleHeight,
    };
}

function getResultSheetMaxHeight(container: HTMLElement | null) {
    return container?.getBoundingClientRect().height ?? window.innerHeight;
}
