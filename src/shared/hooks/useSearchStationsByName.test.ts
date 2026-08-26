import { describe, expect, it } from "vitest";

import { validateStationNameSearchInput } from "./useSearchStationsByName";

describe("validateStationNameSearchInput", () => {
    it("빈 문자열과 공백 문자열은 유효하지 않다", () => {
        expect(validateStationNameSearchInput("")).toMatchObject({
            isValid: false,
            inlineFailure: {
                message: "주유소명을 2자 이상 입력해주세요.",
            },
        });
        expect(validateStationNameSearchInput("   ")).toMatchObject({
            isValid: false,
            inlineFailure: {
                message: "주유소명을 2자 이상 입력해주세요.",
            },
        });
    });

    it("1자는 유효하지 않다", () => {
        expect(validateStationNameSearchInput("보")).toMatchObject({
            isValid: false,
            inlineFailure: {
                message: "주유소명을 2자 이상 입력해주세요.",
            },
        });
    });

    it("2자 이상 30자 이하는 trim된 요청값으로 유효하다", () => {
        expect(validateStationNameSearchInput(" 보라매 ")).toEqual({
            isValid: true,
            osnm: "보라매",
            inlineFailure: null,
        });
        expect(validateStationNameSearchInput("가".repeat(30))).toEqual({
            isValid: true,
            osnm: "가".repeat(30),
            inlineFailure: null,
        });
    });

    it("31자 이상은 유효하지 않다", () => {
        expect(validateStationNameSearchInput("가".repeat(31))).toMatchObject({
            isValid: false,
            inlineFailure: {
                message: "주유소명을 30자 이하로 입력해주세요.",
            },
        });
    });
});
