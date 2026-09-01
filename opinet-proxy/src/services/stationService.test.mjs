import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const opinetService = require("./opinetService");
const localCurrencyService = require("./localCurrencyService");
const stationService = require("./stationService");

describe("stationService", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("경로 검색 결과에 지역화폐 정보를 붙인다", async () => {
        const searchCriteria = { paths: [{ type: "waypoint", points: [] }], radiusKm: 3 };
        const stations = [{ id: "station-1" }];
        const stationsWithLocalCurrency = [{ id: "station-1", localCurrency: { status: "ACCEPTED" } }];
        const fetchStationsSpy = vi.spyOn(opinetService, "fetchStationsAlongPaths").mockResolvedValue(stations);
        const attachLocalCurrencySpy = vi
            .spyOn(localCurrencyService, "attachLocalCurrencyInfo")
            .mockResolvedValue(stationsWithLocalCurrency);

        await expect(stationService.findStationsAlongPaths(searchCriteria)).resolves.toEqual(stationsWithLocalCurrency);
        expect(fetchStationsSpy).toHaveBeenCalledWith(searchCriteria.paths, searchCriteria.radiusKm);
        expect(attachLocalCurrencySpy).toHaveBeenCalledWith(stations);
    });

    it("이름 검색을 오피넷 서비스에 위임한다", async () => {
        const searchCriteria = { osnm: "보라매", area: "01" };
        const stations = [{ id: "station-1" }];
        const fetchStationsSpy = vi.spyOn(opinetService, "fetchStationsByName").mockResolvedValue(stations);

        await expect(stationService.findStationsByName(searchCriteria)).resolves.toEqual(stations);
        expect(fetchStationsSpy).toHaveBeenCalledWith(searchCriteria);
    });
});
