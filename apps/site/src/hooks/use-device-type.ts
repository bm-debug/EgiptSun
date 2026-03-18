import { useMemo } from "react";
import { useWindowSize } from "@uidotdev/usehooks";

export type DeviceType = "mobile" | "tablet" | "desktop";

export interface DeviceTypeBreakpoints {
  mobile: number;
  tablet: number;
}

const DEFAULT_BREAKPOINTS: DeviceTypeBreakpoints = {
  mobile: 640, // sm breakpoint
  tablet: 1024, // lg breakpoint
};

export function useDeviceType(
  breakpoints?: Partial<DeviceTypeBreakpoints>
): DeviceType {
  const { width } = useWindowSize();
  const breakpointsConfig = { ...DEFAULT_BREAKPOINTS, ...breakpoints };

  return useMemo(() => {
    if (width === null) {
      return "desktop"; // Default fallback
    }

    if (width < breakpointsConfig.mobile) {
      return "mobile";
    }

    if (width < breakpointsConfig.tablet) {
      return "tablet";
    }

    return "desktop";
  }, [width, breakpointsConfig.mobile, breakpointsConfig.tablet]);
}
