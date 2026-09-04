import { describe, expect, it } from "vitest";

import {
    createDraftSearch,
    createResultSearch,
    parsePathSearchLocation,
} from "@/features/search-station-by-path/model/pathSearchState";

describe("path search URL contract", () => {
    it("mode가 없으면 검색 전용 값만 제거하고 draft로 정규화한다", () => {
        const parsed = parsePathSearchLocation("?utm_source=test&wp=37,127&radius=2");

        expect(parsed).toEqual({
            mode: "draft",
            needsUrlReplacement: true,
            normalizedSearch: "?utm_source=test&mode=draft",
        });
    });

    it("result 조건을 순서대로 읽고 canonical URL로 정규화한다", () => {
        const parsed = parsePathSearchLocation(
            "?mode=result&mode=draft&wp=37.12345678,127.12345678&wp=36,126&radius=6.23&brand=SKE&brand=SKE&brand=BAD&utm=x",
        );

        expect(parsed).toMatchObject({
            mode: "result",
            needsUrlReplacement: true,
            adjustment: { waypointCount: false, radius: true },
            criteria: {
                waypoints: [
                    { lat: 37.123457, lng: 127.123457 },
                    { lat: 36, lng: 126 },
                ],
                radiusKm: 5,
                selectedBrandCodes: ["SKE"],
            },
        });
        if (parsed.mode !== "result") throw new Error("result expected");
        expect(parsed.normalizedSearch).toBe("?utm=x&mode=result&wp=37.123457%2C127.123457&wp=36%2C126&radius=5&brand=SKE");
    });

    it("웨이포인트가 20개를 넘으면 앞의 20개만 유지한다", () => {
        const params = new URLSearchParams({ mode: "result", radius: "1" });
        for (let index = 0; index < 22; index += 1) params.append("wp", `${index},127`);

        const parsed = parsePathSearchLocation(`?${params}`);

        expect(parsed.mode).toBe("result");
        if (parsed.mode !== "result") return;
        expect(parsed.criteria.waypoints).toHaveLength(20);
        expect(parsed.criteria.waypoints.at(-1)?.lat).toBe(19);
        expect(parsed.adjustment.waypointCount).toBe(true);
    });

    it.each([
        "?mode=result&radius=1",
        "?mode=result&wp=x,127&radius=1",
        "?mode=result&wp=91,127&radius=1",
        "?mode=result&wp=37,127&radius=NaN",
    ])("필수 검색 조건이 잘못되면 draft URL을 반환한다: %s", (search) => {
        expect(parsePathSearchLocation(search)).toMatchObject({ mode: "invalid-result", normalizedSearch: "?mode=draft" });
    });

    it("생성 함수가 반복 파라미터와 명시적인 false를 사용한다", () => {
        const params = createResultSearch("?keep=1", {
            waypoints: [{ lat: 37, lng: 127 }, { lat: 36, lng: 126 }],
            radiusKm: 1.24,
            selectedBrandCodes: ["GSC", "GSC", "BAD"],
        });

        expect(params.getAll("wp")).toEqual(["37,127", "36,126"]);
        expect(params.get("radius")).toBe("1.2");
        expect(params.getAll("brand")).toEqual(["GSC"]);
        expect(createDraftSearch(params).toString()).toBe("keep=1&mode=draft");
    });
});
