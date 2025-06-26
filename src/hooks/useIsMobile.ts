import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);

  React.useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    updateIsMobile();
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    mql.addEventListener("change", onChange);
    window.addEventListener("resize", updateIsMobile);
    return () => {
      mql.removeEventListener("change", onChange);
      window.removeEventListener("resize", updateIsMobile);
    };
  }, [breakpoint]);

  return isMobile;
}