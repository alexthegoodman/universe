import { useEffect, useRef } from "react";

export const useDevEffectOnce = (effect: () => void) => {
  const hasRun = useRef(false);

  useEffect(() => {
    // if (process.env.NODE_ENV !== "production" && !hasRun.current) {
    if (!hasRun.current) {
      effect();
      hasRun.current = true;
    }
  }, []);
};
