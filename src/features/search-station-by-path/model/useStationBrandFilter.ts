import { useCallback, useMemo, useState } from "react";

import type { Station } from "@/shared/types/map";

export function useStationBrandFilter(stations: Station[] | null) {
    const [selectedBrandCodes, setSelectedBrandCodes] = useState<string[]>([]);

    const brandFilterCodes = useMemo(() => {
        if (!stations) return [];

        return Array.from(new Set(stations.map((station) => station.brandCode).filter(isBrandCode)));
    }, [stations]);

    const effectiveSelectedBrandCodes = useMemo(() => {
        const brandFilterCodeSet = new Set(brandFilterCodes);

        return selectedBrandCodes.filter((brandCode) => brandFilterCodeSet.has(brandCode));
    }, [brandFilterCodes, selectedBrandCodes]);

    const toggleBrandCode = useCallback((brandCode: string) => {
        setSelectedBrandCodes((previousBrandCodes) =>
            previousBrandCodes.includes(brandCode)
                ? previousBrandCodes.filter((previousBrandCode) => previousBrandCode !== brandCode)
                : [...previousBrandCodes, brandCode],
        );
    }, []);

    return {
        brandFilterCodes,
        selectedBrandCodes: effectiveSelectedBrandCodes,
        toggleBrandCode,
    };
}

function isBrandCode(brandCode: string | null): brandCode is string {
    return brandCode !== null;
}
