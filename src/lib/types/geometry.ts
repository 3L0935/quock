// On-screen bounds of a measured element, in window coordinates.

// Anchors an overlay to the element it belongs to: above or below its edges, leading-aligned to its left.
// `width` lets a dimming overlay spare the element instead of darkening it with everything else.
export interface AnchorRect {
  top: number;
  bottom: number;
  left: number;
  width: number;
}
