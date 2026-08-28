import { useEffect, useState } from "react";

import {
    type SearchStationByNameFailure,
    type SearchStationByNameFailurePolicy,
    useSearchStationByName,
} from "@/features/search-station-by-name/model/useSearchStationByName";
import { Button } from "@/shared/ui/Button/Button";
import { InlineFailurePresentation } from "@/shared/ui/InlineFailurePresentation/InlineFailurePresentation";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner/LoadingSpinner";
import { useToast } from "@/shared/ui/Toast/useToast";
import { getSearchStationByNameFailureMessage } from "@/features/search-station-by-name/ui/getSearchStationByNameFailureMessage";

export function SearchStationByNamePage() {
    const [stationName, setStationName] = useState("");

    const { state, resetValidationError, retry, search } = useSearchStationByName();

    const { showToast } = useToast();

    const isLoading = state.status === "loading";

    const searchFailure = state.status === "failure" ? state.failure : null;

    const searchFailurePolicy = state.status === "failure" ? state.policy : null;

    const inlineFailureMessage =
        searchFailure && searchFailurePolicy?.presentation === "inline"
            ? getSearchStationByNameFailureMessage(searchFailure)
            : null;

    useEffect(() => {
        if (!searchFailure || !searchFailurePolicy) {
            return;
        }

        if (searchFailurePolicy.report === "always") {
            console.error("주유소 이름 검색 실패:", searchFailure);
        }

        const toast = getSearchStationByNameFailureToast(searchFailure, searchFailurePolicy, retry);

        if (!toast) {
            return;
        }

        showToast(toast);
    }, [retry, searchFailure, searchFailurePolicy, showToast]);

    return (
        <div className="flex min-h-0 flex-1 flex-col px-4 py-6">
            <form
                className="flex flex-row gap-2"
                onSubmit={(event) => {
                    event.preventDefault();

                    if (isLoading) {
                        return;
                    }

                    void search(stationName);
                }}
            >
                <input
                    type="search"
                    value={stationName}
                    onChange={(event) => {
                        setStationName(event.target.value);

                        resetValidationError();
                    }}
                    placeholder="주유소명을 입력해주세요"
                    aria-label="주유소명"
                    className="h-14 min-w-0 flex-1 rounded-lg bg-gil-gray-850 px-4 text-gil-light-text outline-none placeholder:text-gil-gray-600 focus:ring-2 focus:ring-gil-primary"
                />

                <Button type="submit" disabled={isLoading} className="shrink-0">
                    {isLoading ? <LoadingSpinner label="검색 중" /> : "검색"}
                </Button>
            </form>

            <InlineFailurePresentation message={inlineFailureMessage} />

            {state.status === "success" && (
                <section className="mt-6 flex min-h-0 flex-1 flex-col gap-3">
                    <p className="typo-content-medium text-gil-sub-text">검색 결과 {state.stations.length}개</p>

                    {state.stations.length === 0 ? (
                        <p className="typo-content-medium text-gil-gray-500">검색 결과가 없습니다.</p>
                    ) : (
                        <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto">
                            {state.stations.map((station) => (
                                <li
                                    key={station.id}
                                    className="rounded-lg bg-gil-gray-850 px-4 py-3 text-gil-light-text"
                                >
                                    <p className="typo-body-bold">{station.name}</p>

                                    <p className="typo-content-medium mt-1 text-gil-gray-500">
                                        {station.roadAddress ?? station.lotAddress ?? "주소 정보 없음"}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}
        </div>
    );
}

function getSearchStationByNameFailureToast(
    failure: SearchStationByNameFailure,
    policy: SearchStationByNameFailurePolicy,
    retry: () => void,
) {
    if (policy.presentation !== "toast") {
        return null;
    }

    const message = getSearchStationByNameFailureMessage(failure);

    if (policy.recovery !== "manual-retry") {
        return {
            message,
        };
    }

    return {
        message,
        action: {
            label: "다시 시도",
            onClick: retry,
        },
    };
}
