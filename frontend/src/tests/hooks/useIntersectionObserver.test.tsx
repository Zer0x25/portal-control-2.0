import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIntersectionObserver } from "../../hooks/useIntersectionObserver";

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    MockIntersectionObserver.instances.push(this);
  }

  notify(target: Element, isIntersecting: boolean) {
    const entry = { target, isIntersecting } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

describe("useIntersectionObserver", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps one observer when its notification rerenders a changing callback", () => {
    const target = document.createElement("div");
    const targetRef = { current: target };
    const onChangeCalls: number[] = [];

    const { result, rerender } = renderHook(
      ({ callbackValue }) => {
        const entry = useIntersectionObserver(targetRef, {
          onChange: () => onChangeCalls.push(callbackValue),
        });
        return entry;
      },
      { initialProps: { callbackValue: 1 } },
    );

    const observer = MockIntersectionObserver.instances[0];
    expect(observer).toBeDefined();

    act(() => observer?.notify(target, true));

    expect(result.current?.isIntersecting).toBe(true);
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(observer?.observe).toHaveBeenCalledTimes(1);
    expect(observer?.disconnect).not.toHaveBeenCalled();

    rerender({ callbackValue: 2 });
    act(() => observer?.notify(target, false));

    expect(result.current?.isIntersecting).toBe(false);
    expect(onChangeCalls).toEqual([1, 2]);
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(observer?.disconnect).not.toHaveBeenCalled();
  });

  it("disconnects once when freezeOnceVisible is enabled", () => {
    const targetRef = { current: document.createElement("div") };
    renderHook(() => useIntersectionObserver(targetRef, { freezeOnceVisible: true }));

    const observer = MockIntersectionObserver.instances[0];
    act(() => observer?.notify(targetRef.current, true));

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(observer?.disconnect).toHaveBeenCalledTimes(1);
  });
});
