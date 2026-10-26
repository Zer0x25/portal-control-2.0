import React, { useEffect, useRef, useState } from "react";

interface UseIntersectionObserverArgs extends IntersectionObserverInit {
  freezeOnceVisible?: boolean;
  onChange?: (entries: IntersectionObserverEntry[]) => void;
}

export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  {
    threshold = 0,
    root = null,
    rootMargin = "0%",
    freezeOnceVisible = false,
    onChange,
  }: UseIntersectionObserverArgs = {},
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const onChangeRef = useRef(onChange);
  const frozen = Boolean(entry?.isIntersecting && freezeOnceVisible);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const node = elementRef.current;
    const hasIOSupport = !!window.IntersectionObserver;

    if (!hasIOSupport || frozen || !node) return;

    const updateEntry = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      onChangeRef.current?.(entries);
      setEntry(entry);
    };

    const observerParams = { threshold, root, rootMargin };
    const observer = new IntersectionObserver(updateEntry, observerParams);

    observer.observe(node);

    return () => observer.disconnect();
  }, [elementRef, threshold, root, rootMargin, frozen]);

  return entry;
}
