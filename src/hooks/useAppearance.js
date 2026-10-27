import { useLayoutEffect } from "react";

// Riporta le scelte di Impostazioni > Aspetto su <html>, dove index.css le legge.
export function useAppearance({ font, textSize, contrast, motion }) {
  useLayoutEffect(() => {
    const { dataset } = document.documentElement;
    dataset.font = font;
    dataset.size = textSize;
    dataset.contrast = contrast;
    dataset.motion = motion;
  }, [font, textSize, contrast, motion]);
}
