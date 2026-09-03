// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import {
    PATH_SEARCH_DRAFT_STORAGE_KEY,
    readPathSearchDraft,
    writePathSearchDraft,
} from "@/features/search-station-by-path/model/pathSearchDraftStorage";

describe("path search draft storage", () => {
    beforeEach(() => sessionStorage.clear());

    it("저장값이 없으면 초기 draft를 반환한다", () => {
        expect(readPathSearchDraft(sessionStorage)).toEqual({
            draft: { waypoints: [], radiusKm: 1 },
            adjustment: { waypointCount: false, radius: false },
            source: "initial",
        });
    });

    it("좌표·개수·반경을 정규화해 다시 저장한다", () => {
        sessionStorage.setItem(PATH_SEARCH_DRAFT_STORAGE_KEY, JSON.stringify({
            waypoints: Array.from({ length: 21 }, (_, index) => ({ lat: 37.12345678, lng: 127 + index / 100 })),
            radiusKm: 9,
        }));

        const result = readPathSearchDraft(sessionStorage);

        expect(result.source).toBe("storage");
        expect(result.draft.waypoints).toHaveLength(20);
        expect(result.draft.waypoints[0]).toEqual({ lat: 37.123457, lng: 127 });
        expect(result.draft.radiusKm).toBe(5);
        expect(result.adjustment).toEqual({ waypointCount: true, radius: true });
        expect(JSON.parse(sessionStorage.getItem(PATH_SEARCH_DRAFT_STORAGE_KEY)!)).toEqual({
            waypoints: result.draft.waypoints,
            radiusKm: 5,
        });
    });

    it.each(["not-json", JSON.stringify({ waypoints: [{ lat: 100, lng: 127 }], radiusKm: 1 })])(
        "잘못된 저장값을 제거한다",
        (value) => {
            sessionStorage.setItem(PATH_SEARCH_DRAFT_STORAGE_KEY, value);
            expect(readPathSearchDraft(sessionStorage).source).toBe("initial");
            expect(sessionStorage.getItem(PATH_SEARCH_DRAFT_STORAGE_KEY)).toBeNull();
        },
    );

    it("빈 웨이포인트 draft를 유효하게 저장한다", () => {
        expect(writePathSearchDraft(sessionStorage, { waypoints: [], radiusKm: 1.04 })).toBe(true);
        expect(readPathSearchDraft(sessionStorage).draft).toEqual({ waypoints: [], radiusKm: 1 });
    });
});
