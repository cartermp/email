"use client";

import { useEffect } from "react";

const bodyClassCounts = new Map<string, number>();

export default function useBodyClass(className: string) {
  useEffect(() => {
    const body = document.body;
    if (!body) return;

    const nextCount = (bodyClassCounts.get(className) ?? 0) + 1;
    bodyClassCounts.set(className, nextCount);
    if (nextCount === 1) {
      body.classList.add(className);
    }

    return () => {
      const currentCount = bodyClassCounts.get(className) ?? 0;
      if (currentCount <= 1) {
        bodyClassCounts.delete(className);
        body.classList.remove(className);
        return;
      }

      bodyClassCounts.set(className, currentCount - 1);
    };
  }, [className]);
}
