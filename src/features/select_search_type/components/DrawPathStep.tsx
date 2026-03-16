import { Fragment, useState } from "react";
import { Map, Polyline, CustomOverlayMap } from "react-kakao-maps-sdk";

import { ToolButton } from "./ToolButton";
import { Station } from "@/shared/types/map";
import { useMapDrawing } from "@/shared/hooks/useMapDrawing";
import { useStationsSearch } from "@/shared/hooks/useStationsSearch";
import { DEFAULT_MAP_CENTER } from "@/shared/constants/map";

interface DrawPathStepProps {
    onNext: (stations: Station[]) => void;
}

// ✨ 핵심: 반경(km)과 현재 지도 레벨을 바탕으로 픽셀 두께를 계산하는 함수
const calculateStrokeWeight = (radiusKm: number, level: number) => {
    const radiusMeters = radiusKm * 1000;
    const diameterMeters = radiusMeters * 2; // 선의 두께는 반경의 2배(지름)가 되어야 함

    // 카카오맵의 레벨별 해상도 공식 (위도 37도 부근 기준: 1레벨 = 약 0.25m/px)
    const resolution = 0.25 * Math.pow(2, level - 1);

    // 실제 미터 지름을 현재 해상도로 나누어 픽셀 두께를 구함
    return Math.round(diameterMeters / resolution);
};

export function DrawPathStep({ onNext }: DrawPathStepProps) {
    const drawing = useMapDrawing();
    const { fetchStations, isLoading } = useStationsSearch(onNext);

    // ✨ 지도 확대/축소 레벨을 추적하는 State 추가 (초기값 5)
    const [zoomLevel, setZoomLevel] = useState(5);

    const handleSubmit = () => {
        drawing.commitWaypointPath();
        fetchStations(drawing.getAllPaths(), drawing.radius);
    };

    // 현재 반경과 줌 레벨에 맞는 정확한 선 굵기 계산
    const dynamicStrokeWeight = calculateStrokeWeight(drawing.radius, zoomLevel);

    return (
        <div className="relative w-full h-150 bg-gi-gray-900 rounded-lg overflow-hidden flex flex-col items-center justify-end touch-none">
            {isLoading && (
                <div className="absolute inset-0 z-50 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-white mt-4 font-bold">영역 안의 주유소를 찾는 중...</p>
                </div>
            )}

            <Map
                center={DEFAULT_MAP_CENTER}
                style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
                level={zoomLevel} // ✨ State 연결
                onZoomChanged={(map) => setZoomLevel(map.getLevel())} // ✨ 줌 레벨 변경 시 상태 업데이트
                draggable={drawing.tool !== "pen"}
                onMouseDown={drawing.handleMouseDown}
                onMouseMove={drawing.handleMouseMove}
                onMouseUp={drawing.handleMouseUp}
                onClick={drawing.handleMapClick}
                onTouchStart={drawing.handleMouseDown}
                onTouchEnd={drawing.handleMouseUp}
            >
                {drawing.paths.map((path) => (
                    <Fragment key={path.id}>
                        <Polyline
                            path={path.points}
                            strokeWeight={dynamicStrokeWeight}
                            strokeColor="#EAB308"
                            strokeOpacity={0.3}
                            onClick={() => drawing.handlePolylineClick(path.id)}
                        />

                        <Polyline
                            path={path.points}
                            strokeWeight={4}
                            strokeColor="#EAB308"
                            strokeOpacity={1}
                            strokeStyle="solid"
                            onClick={() => drawing.handlePolylineClick(path.id)}
                        />

                        {/* 웨이포인트 동그라미 */}
                        {path.type === "waypoint" &&
                            path.points.map((p, i) => (
                                <CustomOverlayMap key={i} position={p}>
                                    <div
                                        className="w-3 h-3 bg-yellow-500 rounded-full border-2 border-gray-900 shadow-sm transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                                        onClick={() => drawing.handlePolylineClick(path.id)}
                                    />
                                </CustomOverlayMap>
                            ))}
                    </Fragment>
                ))}

                {/* 2. 현재 작업 중인 경로 렌더링 */}
                {drawing.currentPath.length > 0 && (
                    <>
                        <Polyline
                            path={drawing.currentPath}
                            strokeWeight={dynamicStrokeWeight}
                            strokeColor="#EAB308"
                            strokeOpacity={0.3}
                            strokeStyle="solid"
                        />
                        <Polyline
                            path={drawing.currentPath}
                            strokeWeight={4}
                            strokeColor="#EAB308"
                            strokeOpacity={1}
                            strokeStyle="solid"
                        />
                        {drawing.tool === "waypoint" &&
                            drawing.currentPath.map((p, i) => (
                                <CustomOverlayMap key={i} position={p}>
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full border-2 border-gray-900 shadow-sm transform -translate-x-1/2 -translate-y-1/2" />
                                </CustomOverlayMap>
                            ))}
                    </>
                )}
            </Map>

            {/* 하단 컨트롤러 영역 (기존과 완벽히 동일하므로 생략) */}
            <div className="z-20 w-full px-6 pb-6 flex flex-col gap-6 pointer-events-none">
                <div className="flex items-center justify-between w-full pointer-events-auto">
                    {/* 반경 슬라이더 */}
                    <div className="flex flex-col gap-1 w-2/3 max-w-50 bg-gray-900/80 p-3 rounded-2xl backdrop-blur-sm shadow-lg">
                        <span className="text-white text-sm font-bold ml-1">{drawing.radius.toFixed(1)}km</span>
                        <input
                            type="range"
                            min="0.1"
                            max="5.0"
                            step="0.1"
                            value={drawing.radius}
                            onChange={(e) => drawing.setRadius(parseFloat(e.target.value))}
                            className="w-full accent-yellow-500"
                        />
                    </div>

                    <div className="flex gap-2 bg-gray-900/80 p-2 rounded-full backdrop-blur-sm shadow-lg">
                        <ToolButton
                            isActive={drawing.tool === "pen"}
                            icon="✏️"
                            onClick={() => drawing.handleChangeTool("pen")}
                        />
                        <ToolButton
                            isActive={drawing.tool === "waypoint"}
                            icon="📍"
                            onClick={() => drawing.handleChangeTool("waypoint")}
                        />
                        <ToolButton
                            isActive={drawing.tool === "eraser"}
                            icon="🧽"
                            onClick={() => drawing.handleChangeTool("eraser")}
                        />
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-500 text-black font-bold rounded-full transition-colors text-lg shadow-lg pointer-events-auto"
                >
                    {isLoading ? "탐색 중..." : "이 영역에서 찾기"}
                </button>
            </div>
        </div>
    );
}
