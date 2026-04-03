"use client";

import * as React from "react";

import { useIsMobile } from "@/hooks/use-mobile";

function getStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  if (
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  ) {
    return true;
  }
  return false;
}

/**
 * True when the app is used as an installed PWA on a mobile-sized viewport.
 * Use to hide/disable print UI — mobile Safari/PWA print is often unreliable.
 */
export function useDisablePrintOnMobilePwa(): boolean {
  const isMobile = useIsMobile();
  const [standalone, setStandalone] = React.useState(false);

  React.useEffect(() => {
    setStandalone(getStandaloneDisplayMode());
    const mqStandalone = window.matchMedia("(display-mode: standalone)");
    const mqFullscreen = window.matchMedia("(display-mode: fullscreen)");
    const sync = () => setStandalone(getStandaloneDisplayMode());
    mqStandalone.addEventListener("change", sync);
    mqFullscreen.addEventListener("change", sync);
    return () => {
      mqStandalone.removeEventListener("change", sync);
      mqFullscreen.removeEventListener("change", sync);
    };
  }, []);

  return isMobile && standalone;
}
