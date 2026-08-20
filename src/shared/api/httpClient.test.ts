import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";

import { isAppError } from "@/shared/lib/appError";

import { API_BASE_URL, HTTP_TIMEOUT_MS, httpClient } from "./httpClient";

describe("httpClient", () => {
    it("공통 baseURL과 timeout을 가진다", () => {
        expect(API_BASE_URL).toBe("/api");
        expect(httpClient.defaults.baseURL).toBe("/api");
        expect(httpClient.defaults.timeout).toBe(HTTP_TIMEOUT_MS);
    });

    it("response error interceptor에서 axios error를 AppError로 변환한다", async () => {
        await expect(
            httpClient.get("/stations/path", {
                adapter: () => Promise.reject(new AxiosError("timeout", "ECONNABORTED")),
            }),
        ).rejects.toSatisfy((error: unknown) => isAppError(error) && error.code === "TIMEOUT");
    });
});
