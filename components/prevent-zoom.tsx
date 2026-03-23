"use client";

import { useEffect } from "react";

/**
 * Prevents double-tap and double-click zoom on mobile.
 * Works alongside viewport meta and touch-action: pan-x pan-y (no pinch).
 */
export function PreventZoom() {
  useEffect(() => {
    let lastTouchEnd = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    const handleDoubleClick = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("touchend", handleTouchEnd, { passive: false });
    document.addEventListener("dblclick", handleDoubleClick, { capture: true });

    return () => {
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("dblclick", handleDoubleClick);
    };
  }, []);

  return null;
}
