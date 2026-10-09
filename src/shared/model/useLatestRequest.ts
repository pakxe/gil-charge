import { useCallback, useEffect, useRef } from "react";

type RequestHandlers<T> = {
    request: (signal: AbortSignal) => Promise<T>;
    onSuccess: (data: T) => void;
    onError: (error: unknown) => void;
};

/** 요청 수명만 관리한다. 입력 검증, 화면 상태, 실패 정책은 호출자가 담당한다. */
export function useLatestRequest() {
    const currentControllerRef = useRef<AbortController | null>(null);

    const cancel = useCallback(() => {
        currentControllerRef.current?.abort();
        currentControllerRef.current = null;
    }, []);

    const run = useCallback(async <T,>({ request, onSuccess, onError }: RequestHandlers<T>) => {
        currentControllerRef.current?.abort();

        const controller = new AbortController();
        currentControllerRef.current = controller;

        try {
            let data: T;

            try {
                data = await request(controller.signal);
            } catch (error) {
                if (!controller.signal.aborted) {
                    onError(error);
                }
                return;
            }

            if (!controller.signal.aborted) {
                onSuccess(data);
            }
        } finally {
            if (currentControllerRef.current === controller) {
                currentControllerRef.current = null;
            }
        }
    }, []);

    useEffect(() => {
        return cancel;
    }, [cancel]);

    return { run, cancel };
}
