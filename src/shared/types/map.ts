export type LatLng = {
    // 가로 세로
    lat: number;
    lng: number;
};

export interface Station {
    id: string;
    name: string;
    price: number;
    lat: number;
    lng: number;
    brand: string;
}

// export type LatLng = { lat: number; lng: number };
export type DrawingType = "pen" | "waypoint";
export type PathSet = { id: string; type: DrawingType; points: LatLng[] };
export type Tool = "pen" | "waypoint" | "eraser";
