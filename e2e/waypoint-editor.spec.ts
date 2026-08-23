import { expect, test, type Locator, type Page } from "@playwright/test";

const WAYPOINT_PAGE = "/waypoint";
const MAP_SURFACE_SELECTOR = '[data-map-surface="waypoint-search"]';
const MAP_READY_TIMEOUT = 30_000;
const MARKER_POSITION_TOLERANCE_PX = 24;

test.describe("웨이포인트 편집", () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(WAYPOINT_PAGE);

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
