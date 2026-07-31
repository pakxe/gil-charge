import { LatLng, PathSet, Tool } from "@/shared/types/map";
import { useState } from "react";

export function useMapDrawing() {
    const [tool, setTool] = useState<Tool>("waypoint");
    const [radius, setRadius] = useState<number>(0.1);
    const [paths, setPaths] = useState<PathSet[]>([]);
    const [currentPath, setCurrentPath] = useState<LatLng[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);

    const handleMouseDown = () => {
        if (tool === "pen") {
            setIsDrawing(true);
        }
    };

    const handleMouseMove = (_map: kakao.maps.Map, mouseEvent: kakao.maps.event.MouseEvent) => {
        if (tool === "pen" && isDrawing) {
            setCurrentPath((prev) => [...prev, { lat: mouseEvent.latLng.getLat(), lng: mouseEvent.latLng.getLng() }]);
        }
    };

    const handleMouseUp = () => {
        if (tool === "pen" && isDrawing) {
            setIsDrawing(false);
            if (currentPath.length > 0) {
                setPaths((prev) => [...prev, { id: Date.now().toString(), type: "pen", points: currentPath }]);
                setCurrentPath([]);
            }
        }
    };

    const handleMapClick = (_map: kakao.maps.Map, mouseEvent: kakao.maps.event.MouseEvent) => {
        if (tool === "waypoint") {
            setCurrentPath((prev) => [...prev, { lat: mouseEvent.latLng.getLat(), lng: mouseEvent.latLng.getLng() }]);
        }
    };

    const handlePolylineClick = (pathId: string) => {
        if (tool === "eraser") {
            setPaths((prev) => prev.filter((p) => p.id !== pathId));
        }
    };

    const commitWaypointPath = () => {
        if (currentPath.length > 0) {
            setPaths((prev) => [...prev, { id: Date.now().toString(), type: "waypoint", points: currentPath }]);
            setCurrentPath([]);
        }
    };

    const handleChangeTool = (newTool: Tool) => {
        if (newTool === "eraser") {
            commitWaypointPath();
        } else {
            setPaths([]);
            setCurrentPath([]);
        }

        setTool(newTool);
    };

    const getAllPaths = () => {
        const allPaths = [...paths];
        if (currentPath.length > 0) {
            allPaths.push({
                id: Date.now().toString(),
                type: tool === "pen" ? "pen" : "waypoint",
                points: currentPath,
            });
        }
        return allPaths;
    };

    return {
        tool,
        radius,
        paths,
        currentPath,
        setRadius,
        handleChangeTool,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleMapClick,
        handlePolylineClick,
        commitWaypointPath,
        getAllPaths,
    };
}
