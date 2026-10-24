import React, { Suspense, useEffect, useRef, useState } from "react";
import LazySectionFallback from "../../../components/ui/LazySectionFallback";
import type { TimeRecordTableProps } from "./TimeRecordTable";

const TimeRecordTable = React.lazy(() => import("./TimeRecordTable"));

const DeferredTimeRecordTable: React.FC<TimeRecordTableProps> = (props) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);

  useEffect(() => {
    const target = sectionRef.current;
    if (!target || typeof window.IntersectionObserver !== "function") {
      setHasEnteredViewport(true);
      return;
    }

    const observer = new window.IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setHasEnteredViewport(true);
        observer.disconnect();
      }
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="min-h-[400px]" data-testid="deferred-time-record-table">
      {hasEnteredViewport ? (
        <Suspense
          fallback={
            <div className="min-h-[400px]">
              <LazySectionFallback rows={4} className="min-h-[400px] px-2 py-8" />
            </div>
          }
        >
          <TimeRecordTable {...props} />
        </Suspense>
      ) : (
        <div
          aria-hidden="true"
          className="min-h-[400px]"
          data-testid="deferred-time-record-table-fallback"
        >
          <LazySectionFallback rows={4} className="min-h-[400px] px-2 py-8" />
        </div>
      )}
    </div>
  );
};

export default DeferredTimeRecordTable;
