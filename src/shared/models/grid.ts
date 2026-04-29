type Point = {
    x: number;
    y: number;
};

type Bounds = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
};

type Grid<T> = {
    cellSize: number;
    cells: Map<string, GridItem<T>[]>;
};

type GridItem<T> = {
    id: string;
    point: Point;
    data: T;
};

type CellPoint = {
    x: number;
    y: number;
};

function create<T>(items: GridItem<T>[], cellSize: number): Grid<T> {
    const grid: Grid<T> = {
        cellSize,
        cells: new Map<string, GridItem<T>[]>(),
    };

    for (const item of items) {
        add(grid, item);
    }

    return grid;
}

function add<T>(grid: Grid<T>, item: GridItem<T>) {
    const key = getCellKey(item.point, grid.cellSize);
    const cell = grid.cells.get(key);

    if (cell) {
        cell.push(item);
    } else {
        grid.cells.set(key, [item]);
    }
}

function getCellKey(point: Point, cellSize: number): string {
    const { x, y } = getCellPoint(point, cellSize);

    return getCellKeyByIndex(x, y);
}

function getCellPoint(point: Point, cellSize: number): CellPoint {
    return {
        x: Math.floor(point.x / cellSize),
        y: Math.floor(point.y / cellSize),
    };
}

function getCellKeyByIndex(x: number, y: number): string {
    return `${x}:${y}`;
}

function getItemsInBounds<T>(grid: Grid<T>, bounds: Bounds): GridItem<T>[] {
    const min = getCellPoint(
        {
            x: bounds.minX,
            y: bounds.minY,
        },
        grid.cellSize,
    );

    const max = getCellPoint(
        {
            x: bounds.maxX,
            y: bounds.maxY,
        },
        grid.cellSize,
    );

    const result: GridItem<T>[] = [];

    for (let y = min.y; y <= max.y; y++) {
        for (let x = min.x; x <= max.x; x++) {
            const key = getCellKeyByIndex(x, y);
            const cell = grid.cells.get(key);

            if (!cell) continue;

            for (const item of cell) {
                const { x, y } = item.point;

                if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY) {
                    result.push(item);
                }
            }
        }
    }

    return result;
}

const grid = {
    create,
    add,
    getItemsInBounds,
};

export { grid };
