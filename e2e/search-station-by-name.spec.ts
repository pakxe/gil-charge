import { expect, test, type Page } from "@playwright/test";

const SEARCH_STATION_BY_NAME_PAGE = "/search-station-by-name";
const SEARCH_STATION_BY_NAME_API = "**/api/stations/name**";

const station = {
    id: "A0001145",
    name: "대양석유(주)직영 보라매주유소",
    brand: "SKE",
    chargingStationBrand: null,
    lotAddress: "서울 관악구 봉천동 729-4",
    roadAddress: "서울 관악구 보라매로 26 (봉천동)",
    sigunCode: "0117",
    lpgYn: "N",
    gis: {
        x: 305321.3685,
        y: 543824.2418,
        coordinateSystem: "KATEC",
    },
    lat: 37.49172112762502,
    lng: 126.92672469000718,
};

test.describe("주유소명 검색 에러 처리", () => {
    test("재시도 가능한 서버 오류를 안내하고 같은 검색어로 복구한다", async ({ page }) => {
        let releaseFirstResponse = () => {};
        const waitForFirstResponse = new Promise<void>((resolve) => {
            releaseFirstResponse = resolve;
        });
        const requestedStationNames: (string | null)[] = [];

        await page.route(SEARCH_STATION_BY_NAME_API, async (route) => {
            requestedStationNames.push(new URL(route.request().url()).searchParams.get("osnm"));

            if (requestedStationNames.length === 1) {
                await waitForFirstResponse;
                await route.fulfill({
                    status: 502,
                    json: {
                        code: "OPINET_UNAVAILABLE",
                        message: "유가 정보를 가져올 수 없습니다.",
                    },
                });
                return;
            }

            await route.fulfill({
                status: 200,
                json: { stations: [station] },
            });
        });

        await openSearchStationByNamePage(page);
        await page.getByRole("searchbox", { name: "주유소명" }).fill("보라매");
        await page.getByRole("button", { name: "검색", exact: true }).click();

        await expect.poll(() => requestedStationNames.length).toBe(1);

        const defaultPrevented = await page.locator("form").evaluate((form) => {
            const submitEvent = new SubmitEvent("submit", {
                bubbles: true,
                cancelable: true,
            });

            form.dispatchEvent(submitEvent);
            return submitEvent.defaultPrevented;
        });

        expect(defaultPrevented).toBe(true);
        expect(requestedStationNames).toHaveLength(1);
        await expect(page).toHaveURL(new RegExp(`${SEARCH_STATION_BY_NAME_PAGE}$`));

        releaseFirstResponse();

        const failureToast = page.getByRole("status").filter({ hasText: "요청이 실패했습니다." });
        await expect(failureToast).toBeVisible();
        await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();

        await page.getByRole("button", { name: "다시 시도" }).click();

        await expect.poll(() => requestedStationNames).toEqual(["보라매", "보라매"]);
        await expect(failureToast).toHaveCount(0);
        await expect(page.getByText("검색 결과 1개")).toBeVisible();
        await expect(page.getByText(station.name)).toBeVisible();
        await expect(page.getByText(station.roadAddress)).toBeVisible();
    });

    test("잘못된 클라이언트 입력은 인라인으로 안내하고 API를 호출하지 않는다", async ({ page }) => {
        let requestCount = 0;

        await page.route(SEARCH_STATION_BY_NAME_API, async (route) => {
            requestCount += 1;
            await route.fulfill({ status: 200, json: { stations: [] } });
        });

        await openSearchStationByNamePage(page);

        const searchInput = page.getByRole("searchbox", { name: "주유소명" });
        const searchButton = page.getByRole("button", { name: "검색", exact: true });

        await searchButton.click();
        await expect(page.getByRole("alert")).toHaveText("주유소명을 2자 이상 입력해주세요.");

        await searchInput.fill("보");
        await expect(page.getByRole("alert")).toHaveCount(0);
        await searchButton.click();
        await expect(page.getByRole("alert")).toHaveText("주유소명을 2자 이상 입력해주세요.");

        await searchInput.fill("가".repeat(31));
        await expect(page.getByRole("alert")).toHaveCount(0);
        await searchButton.click();
        await expect(page.getByRole("alert")).toHaveText("주유소명을 30자 이하로 입력해주세요.");
        expect(requestCount).toBe(0);
    });

    test("백엔드 입력 오류는 토스트 없이 인라인으로 안내한다", async ({ page }) => {
        await page.route(SEARCH_STATION_BY_NAME_API, async (route) => {
            await route.fulfill({
                status: 400,
                json: {
                    code: "INVALID_INPUT",
                    message: "입력값이 올바르지 않습니다.",
                },
            });
        });

        await openSearchStationByNamePage(page);

        const searchInput = page.getByRole("searchbox", { name: "주유소명" });
        await searchInput.fill("보라매");
        await page.getByRole("button", { name: "검색", exact: true }).click();

        await expect(page.getByRole("alert")).toHaveText("입력값을 확인해주세요.");
        await expect(page.getByRole("status")).toHaveCount(0);
        await expect(page.getByRole("button", { name: "다시 시도" })).toHaveCount(0);

        await searchInput.fill("보라매2");
        await expect(page.getByRole("alert")).toHaveCount(0);
    });

    test("잘못된 성공 응답은 재시도 액션 없는 토스트로 안내한다", async ({ page }) => {
        await page.route(SEARCH_STATION_BY_NAME_API, async (route) => {
            await route.fulfill({
                status: 200,
                json: { items: [] },
            });
        });

        await openSearchStationByNamePage(page);
        await page.getByRole("searchbox", { name: "주유소명" }).fill("보라매");
        await page.getByRole("button", { name: "검색", exact: true }).click();

        const failureToast = page.getByRole("status").filter({ hasText: "요청을 처리할 수 없습니다." });
        await expect(failureToast).toBeVisible();
        await expect(page.getByRole("button", { name: "다시 시도" })).toHaveCount(0);
        await expect(page.getByRole("alert")).toHaveCount(0);
    });
});

async function openSearchStationByNamePage(page: Page) {
    await page.goto(SEARCH_STATION_BY_NAME_PAGE);
    await expect(page.getByRole("searchbox", { name: "주유소명" })).toBeVisible();
}
