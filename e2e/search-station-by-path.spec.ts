import { expect, test, type Locator, type Page } from "@playwright/test";

const SEARCH_STATION_BY_PATH_PAGE = "/search-station-by-path";
const MAP_SURFACE_SELECTOR = '[data-map-surface="search-station-by-path"]';
const MAP_READY_TIMEOUT = 30_000;
const MARKER_POSITION_TOLERANCE_PX = 24;

test.describe("웨이포인트 편집", () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(SEARCH_STATION_BY_PATH_PAGE);

        await expect(getMapSurface(page)).toBeVisible();
        await expect(page.locator('[data-map-state="loading"]')).toBeHidden({
            timeout: MAP_READY_TIMEOUT,
        });
        await expect(page.locator('[data-map-state="error"]')).toHaveCount(0);
    });

    test("지도 클릭으로 웨이포인트를 만들고 삭제한다", async ({ page }) => {
        const mapSurface = getMapSurface(page);
        const clickPoint = await getCenterPoint(mapSurface);

        await page.mouse.click(clickPoint.x, clickPoint.y);

        const waypoint = getWaypoint(page, 1);
        await expect(waypoint).toBeVisible();
        await expect(page.getByRole("button", { name: "1번째 웨이포인트" })).toHaveCount(1);

        await expectWaypointNearPoint(waypoint, clickPoint);

        await waypoint.click();

        const deleteButton = page.getByRole("button", { name: "1번째 웨이포인트 삭제" });
        await expect(deleteButton).toBeVisible();

        await deleteButton.click();

        await expect(waypoint).toHaveCount(0);
        await expect(deleteButton).toHaveCount(0);
    });

    test("웨이포인트를 실행 취소하고 다시 실행한다", async ({ page }) => {
        const mapSurface = getMapSurface(page);
        const mapBox = await mapSurface.boundingBox();
        expect(mapBox).not.toBeNull();

        const firstPoint = {
            x: mapBox!.x + mapBox!.width / 2 - 80,
            y: mapBox!.y + mapBox!.height / 2,
        };
        const secondPoint = {
            x: mapBox!.x + mapBox!.width / 2 + 80,
            y: mapBox!.y + mapBox!.height / 2,
        };

        await page.mouse.click(firstPoint.x, firstPoint.y);
        await page.mouse.click(secondPoint.x, secondPoint.y);

        const firstWaypoint = getWaypoint(page, 1);
        const secondWaypoint = getWaypoint(page, 2);
        await expect(firstWaypoint).toBeVisible();
        await expect(secondWaypoint).toBeVisible();

        const undoButton = page.getByRole("button", { name: "웨이포인트 실행 취소" });
        const redoButton = page.getByRole("button", { name: "웨이포인트 다시 실행" });
        await expect(undoButton).toBeEnabled();
        await expect(redoButton).toBeDisabled();

        await undoButton.click();

        await expect(firstWaypoint).toBeVisible();
        await expect(secondWaypoint).toHaveCount(0);
        await expect(redoButton).toBeEnabled();

        await redoButton.click();

        await expect(firstWaypoint).toBeVisible();
        await expect(secondWaypoint).toBeVisible();
        await expect(page.getByRole("button", { name: /웨이포인트$/ })).toHaveCount(2);
    });

    test("선택 모드에서 라쏘로 선택한 웨이포인트만 삭제한다", async ({ page }) => {
        const mapSurface = getMapSurface(page);
        const mapBox = await mapSurface.boundingBox();
        expect(mapBox).not.toBeNull();

        const center = {
            x: mapBox!.x + mapBox!.width / 2,
            y: mapBox!.y + mapBox!.height / 2,
        };
        const waypointPoints = [
            { x: center.x - 80, y: center.y - 80 },
            { x: center.x, y: center.y - 80 },
            { x: center.x + 100, y: center.y - 80 },
            { x: center.x - 80, y: center.y + 40 },
            { x: center.x + 100, y: center.y + 40 },
        ];

        for (const point of waypointPoints) {
            await page.mouse.click(point.x, point.y);
        }

        await expect(getWaypoint(page, 5)).toBeVisible();

        const selectModeButton = page.getByRole("button", { name: "선택", exact: true });
        await selectModeButton.click();
        await expect(selectModeButton).toHaveAttribute("aria-pressed", "true");

        const lassoSurface = page.locator('[data-lasso-surface="waypoint-selection"]');
        await expect(lassoSurface).toBeVisible();

        const lassoBox = await lassoSurface.boundingBox();
        expect(lassoBox).not.toBeNull();

        const lassoStart = {
            x: center.x - 130,
            y: center.y - 130,
        };
        const lassoTopRight = {
            x: center.x + 30,
            y: center.y - 130,
        };
        const lassoBottomRight = {
            x: center.x + 30,
            y: center.y + 90,
        };
        const lassoBottomLeft = {
            x: center.x - 130,
            y: center.y + 90,
        };

        await page.mouse.move(lassoStart.x, lassoStart.y);
        await page.mouse.down();
        await page.mouse.move(lassoTopRight.x, lassoTopRight.y, { steps: 8 });
        await page.mouse.move(lassoBottomRight.x, lassoBottomRight.y, { steps: 8 });
        await page.mouse.move(lassoBottomLeft.x, lassoBottomLeft.y, { steps: 8 });
        await page.mouse.move(lassoStart.x, lassoStart.y, { steps: 8 });
        await page.mouse.up();

        const selectDeleteButton = page.getByRole("button", { name: "선택 삭제" });
        await expect(selectDeleteButton).toBeEnabled();
        await selectDeleteButton.click();

        const remainingWaypoints = getWaypointMarkers(page);
        await expect(remainingWaypoints).toHaveCount(2);
        await expect(selectDeleteButton).toBeDisabled();
        await expectWaypointNearPoint(remainingWaypoints.nth(0), waypointPoints[2]!);
        await expectWaypointNearPoint(remainingWaypoints.nth(1), waypointPoints[4]!);
    });

    test("전체 삭제로 모든 웨이포인트를 제거한다", async ({ page }) => {
        const mapSurface = getMapSurface(page);
        const mapBox = await mapSurface.boundingBox();
        expect(mapBox).not.toBeNull();

        const center = {
            x: mapBox!.x + mapBox!.width / 2,
            y: mapBox!.y + mapBox!.height / 2,
        };
        const waypointPoints = [
            { x: center.x - 80, y: center.y - 80 },
            { x: center.x, y: center.y - 80 },
            { x: center.x + 80, y: center.y - 80 },
            { x: center.x - 80, y: center.y + 40 },
            { x: center.x + 80, y: center.y + 40 },
        ];

        for (const point of waypointPoints) {
            await page.mouse.click(point.x, point.y);
        }

        const waypoints = getWaypointMarkers(page);
        await expect(waypoints).toHaveCount(5);

        await page.getByRole("button", { name: "전체 삭제" }).click();

        await expect(waypoints).toHaveCount(0);
    });

    test("웨이포인트를 드래그하면 pointerup 위치로 이동한다", async ({ page }) => {
        const mapSurface = getMapSurface(page);
        const createPoint = await getCenterPoint(mapSurface);

        await page.mouse.click(createPoint.x, createPoint.y);

        const waypoint = getWaypoint(page, 1);
        await expect(waypoint).toBeVisible();

        const dragStart = await getCenterPoint(waypoint);
        const pointerUpPoint = {
            x: dragStart.x + 120,
            y: dragStart.y + 60,
        };

        await page.mouse.move(dragStart.x, dragStart.y);
        await page.mouse.down();
        await page.mouse.move(pointerUpPoint.x, pointerUpPoint.y, { steps: 12 });
        await page.mouse.up();

        await expectWaypointNearPoint(waypoint, pointerUpPoint);
        await expect(page.getByRole("button", { name: "1번째 웨이포인트" })).toHaveCount(1);
    });
});

function getMapSurface(page: Page): Locator {
    return page.locator(MAP_SURFACE_SELECTOR);
}

function getWaypoint(page: Page, index: number): Locator {
    return page.getByRole("button", { name: `${index}번째 웨이포인트` });
}

function getWaypointMarkers(page: Page): Locator {
    return page.getByRole("button", { name: /^\d+번째 웨이포인트$/ });
}

async function getCenterPoint(locator: Locator) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();

    return {
        x: box!.x + box!.width / 2,
        y: box!.y + box!.height / 2,
    };
}

async function expectWaypointNearPoint(waypoint: Locator, point: { x: number; y: number }) {
    await expect
        .poll(
            async () => {
                const waypointPoint = await getCenterPoint(waypoint);

                return Math.hypot(waypointPoint.x - point.x, waypointPoint.y - point.y);
            },
            { timeout: 3_000 },
        )
        .toBeLessThan(MARKER_POSITION_TOLERANCE_PX);
}
