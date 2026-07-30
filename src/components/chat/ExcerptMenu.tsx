// Contextual menu for a long-pressed reply unit — Deep dive / Web search on that excerpt. RN cannot extend iOS's own
// selection menu, so the platter is <GlassToolbar> and this file owns anchoring, the dim behind it, and the transitions.

import { Globe, Sparkles } from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import {
  Keyboard,
  Pressable as RNPressable,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  GlassToolbar,
  glassToolbarHeight,
  type GlassToolbarAction,
} from "@/components/ui/GlassToolbar";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { useThemeColors } from "@/lib/theme/ThemeContext";
import { springEasing, surfaceSpring } from "@/lib/design/motion";
import { componentLayout, motion, timings, zLayer } from "@/lib/design/tokens";
import { useUIStore } from "@/lib/stores/ui.store";

const TOOLBAR = componentLayout.glassToolbar;
// The platter shares the gutter the floating header orbs keep off the display edge.
const SIDE_GUTTER = componentLayout.floatingHeader.sidePad;

export interface ExcerptMenuProps {
  canWebSearch: boolean;
  /** Safe-area top + floating header, so the menu never rises into the header orbs. */
  topInset: number;
  /** Composer as measured by ChatHome (plus the keyboard when open), so the menu never drops into it. */
  bottomInset: number;
  onDeepDive: (text: string) => void;
  onWebSearch: (text: string) => void;
}

export const ExcerptMenu = React.memo(function ExcerptMenu({
  canWebSearch,
  topInset,
  bottomInset,
  onDeepDive,
  onWebSearch,
}: ExcerptMenuProps): React.ReactElement | null {
  const colors = useThemeColors();
  const haptics = useHaptics();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const open = useUIStore((s) => s.excerptMenuOpen);
  const text = useUIStore((s) => s.excerptMenuText);
  const anchor = useUIStore((s) => s.excerptMenuAnchor);
  const close = useUIStore((s) => s.closeExcerptMenu);
  // Kept mounted through the exit animation, as <Sheet> does — unmounting on the flag alone would cut it off mid-fade.
  const [mounted, setMounted] = React.useState(open);
  const progress = useSharedValue(0);
  const releaseMount = useCallback((): void => {
    setMounted(false);
  }, []);
  React.useEffect(() => {
    if (open) {
      setMounted(true);
      // iOS answers the long-press with an impact and drops the keyboard before the menu paints.
      haptics.medium();
      Keyboard.dismiss();
      progress.value = withSpring(1, surfaceSpring);
      return;
    }
    progress.value = withTiming(
      0,
      { duration: timings.fast, easing: springEasing },
      (finished) => {
        "worklet";
        if (finished) runOnJS(releaseMount)();
      },
    );
  }, [open, progress, haptics, releaseMount]);
  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const toolbarStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        scale:
          motion.scaleDialogFrom +
          (1 - motion.scaleDialogFrom) * progress.value,
      },
    ],
  }));
  const actions = useMemo<GlassToolbarAction[]>(
    () => [
      {
        icon: Sparkles,
        label: "Deep dive",
        onPress: (): void => onDeepDive(text),
        accessibilityLabel: "Deep dive on this",
      },
      ...(canWebSearch
        ? [
            {
              icon: Globe,
              label: "Web search",
              onPress: (): void => onWebSearch(text),
              accessibilityLabel: "Web search on this",
            },
          ]
        : []),
    ],
    [canWebSearch, onDeepDive, onWebSearch, text],
  );
  // Both placements clamp into the same band, so neither the header orbs nor the composer can end up covered.
  const position = useMemo(() => {
    const lowest = Math.max(
      topInset,
      screenHeight - bottomInset - glassToolbarHeight,
    );
    const above = anchor.top - TOOLBAR.anchorGap - glassToolbarHeight;
    const top =
      above >= topInset
        ? Math.min(above, lowest)
        : Math.min(
            Math.max(topInset, anchor.bottom + TOOLBAR.anchorGap),
            lowest,
          );
    // Leading-aligned to the pressed block, like the kit — never centred on the display.
    const left = Math.min(
      Math.max(SIDE_GUTTER, anchor.left),
      screenWidth - TOOLBAR.containerWidth - SIDE_GUTTER,
    );
    return { top, left };
  }, [anchor, bottomInset, screenHeight, screenWidth, topInset]);
  if (!mounted) return null;
  return (
    <View
      className="absolute inset-0"
      style={{ zIndex: zLayer.menu }}
      pointerEvents="box-none"
      accessibilityViewIsModal
    >
      {/* Kit ships a "Context Menu - Dimming Overlay": content behind a menu dims, and the dim is the dismiss target. */}
      <RNPressable
        className="absolute inset-0"
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={close}
      >
        <Animated.View
          className="absolute inset-0"
          style={[{ backgroundColor: colors.scrim }, scrimStyle]}
        />
      </RNPressable>
      <Animated.View
        style={[
          { position: "absolute", top: position.top, left: position.left },
          toolbarStyle,
        ]}
      >
        <GlassToolbar actions={actions} />
      </Animated.View>
    </View>
  );
});
