// Mask paint, not palette: MaskedView and SVG masks read alpha, so these mean "show" and "hide" rather than black and
// transparent. They live here so the two masks in the excerpt menu share one definition instead of restating it.

export const MASK_OPAQUE = "#000000";
export const MASK_CLEAR = "rgba(0,0,0,0)";
