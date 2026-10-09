// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLatestRequest } from "./useLatestRequest";

afterEach(cleanup);

describe("useLatestRequest", () => {
    it("요청에 signal을 전달하고 성공 데이터를 호출자에게 전달한다", async () => {
        const task = createTask();
        const { result } = renderHook(() => useLatestRequest());
        const run = result.current.run(task);
        expect(getSignal(task)).toBeInstanceOf(AbortSignal);
        expect(getSignal(task).aborted).toBe(false);
        task.resolve("result");
        await run;
        expect(task.onSuccess).toHaveBeenCalledExactlyOnceWith("result");
        expect(task.onError).not.toHaveBeenCalled();
    });

    it.each(["throw", "reject"] as const)("요청의 %s 오류를 onError에 전달한다", async (mode) => {
        const task = createTask();
        const error = new Error("request failed");
        task.request.mockImplementation(() => {
            if (mode === "throw") throw error;
            return Promise.reject(error);
        });
        const { result } = renderHook(() => useLatestRequest());
        await result.current.run(task);
        expect(task.onError).toHaveBeenCalledExactlyOnceWith(error);
        expect(task.onSuccess).not.toHaveBeenCalled();
    });

    it.each(["success", "failure"] as const)("B 완료 후 A의 늦은 %s는 반영하지 않는다", async (outcome) => {
        const a = createTask();
        const b = createTask();
        const { result } = renderHook(() => useLatestRequest());
        const runA = result.current.run(a);
        const runB = result.current.run(b);
        expect(getSignal(a).aborted).toBe(true);
        expect(getSignal(b).aborted).toBe(false);
        b.resolve("latest");
        await runB;
        settle(a, outcome);
        await runA;
        expect(b.onSuccess).toHaveBeenCalledExactlyOnceWith("latest");
        expect(b.onError).not.toHaveBeenCalled();
        expect(a.onSuccess).not.toHaveBeenCalled();
        expect(a.onError).not.toHaveBeenCalled();
    });

    it.each(["success", "failure"] as const)("A가 먼저 %s로 종료돼도 C 시작 시 진행 중인 B를 취소한다", async (outcome) => {
        const a = createTask();
        const b = createTask();
        const c = createTask();
        const { result } = renderHook(() => useLatestRequest());
        const runA = result.current.run(a);
        const runB = result.current.run(b);
        settle(a, outcome);
        await runA;
        expect(getSignal(b).aborted).toBe(false);
        const runC = result.current.run(c);
        expect(getSignal(b).aborted).toBe(true);
        expect(getSignal(c).aborted).toBe(false);
        c.resolve("latest");
        await runC;
        b.resolve("old");
        await runB;
        expect(c.onSuccess).toHaveBeenCalledExactlyOnceWith("latest");
        expect(c.onError).not.toHaveBeenCalled();
        expect(a.onSuccess).not.toHaveBeenCalled();
        expect(a.onError).not.toHaveBeenCalled();
        expect(b.onSuccess).not.toHaveBeenCalled();
        expect(b.onError).not.toHaveBeenCalled();
    });

    it("명시적으로 취소한 요청의 결과는 무시하고 이후 요청은 실행한다", async () => {
        const a = createTask();
        const b = createTask();
        const { result } = renderHook(() => useLatestRequest());
        const runA = result.current.run(a);
        result.current.cancel();
        expect(getSignal(a).aborted).toBe(true);
        a.resolve("canceled");
        await runA;
        const runB = result.current.run(b);
        b.resolve("new");
        await runB;
        expect(a.onSuccess).not.toHaveBeenCalled();
        expect(a.onError).not.toHaveBeenCalled();
        expect(b.onSuccess).toHaveBeenCalledExactlyOnceWith("new");
    });

    it.each(["success", "failure"] as const)("unmount 시 요청을 취소하고 늦은 %s 콜백은 호출하지 않는다", async (outcome) => {
        const task = createTask();
        const { result, unmount } = renderHook(() => useLatestRequest());
        const run = result.current.run(task);
        unmount();
        expect(getSignal(task).aborted).toBe(true);
        settle(task, outcome);
        await run;
        expect(task.onSuccess).not.toHaveBeenCalled();
        expect(task.onError).not.toHaveBeenCalled();
    });
});

function createTask() {
    let resolve!: (value: string) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<string>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return {
        request: vi.fn<(signal: AbortSignal) => Promise<string>>().mockReturnValue(promise),
        onSuccess: vi.fn<(data: string) => void>(),
        onError: vi.fn<(error: unknown) => void>(),
        resolve,
        reject,
    };
}

function getSignal(task: ReturnType<typeof createTask>) {
    const signal = task.request.mock.calls[0]?.[0];
    if (!signal) throw new Error("요청에 signal이 전달되지 않았습니다.");
    return signal;
}

function settle(task: ReturnType<typeof createTask>, outcome: "success" | "failure") {
    if (outcome === "success") task.resolve("old");
    else task.reject(new Error("old request failed"));
}
