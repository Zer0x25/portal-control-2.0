import React, { useEffect, useState } from "react";

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
  const frozen = entry?.isIntersecting && freezeOnceVisible;

  const updateEntry = (entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (onChange) onChange(entries);
    setEntry(entry);
  };

  useEffect(() => {
    const node = elementRef?.current;
    const hasIOSupport = !!window.IntersectionObserver;

    if (!hasIOSupport || frozen || !node) return;

    const observerParams = { threshold, root, rootMargin };
    const observer = new IntersectionObserver(updateEntry, observerParams);

    observer.observe(node);

    return () => observer.disconnect();
  }, [elementRef?.current, threshold, root, rootMargin, frozen]);

  return entry;
}
