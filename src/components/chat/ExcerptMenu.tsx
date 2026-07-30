// Contextual menu for a long-pressed reply unit — Deep dive / Web search on that excerpt. RN cannot extend iOS's own
// selection menu, so the platter is <GlassToolbar> and this file owns anchoring, the dim behind it, and the transitions.

import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { Globe, Sparkles } from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import {
  Keyboard,
  Pressable as RNPressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import {
  GlassToolbar,
  glassToolbarHeight,
  type GlassToolbarAction,
} from "@/components/ui/GlassToolbar";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { useTheme, useThemeColors } from "@/lib/theme/ThemeContext";
import { withAlpha } from "@/lib/design/color";
import { springEasing, surfaceSpring } from "@/lib/design/motion";
import {
  boxShadow,
  componentLayout,
  motion,
  timings,
  zLayer,
} from "@/lib/design/tokens";
import { useUIStore } from "@/lib/stores/ui.store";

const TOOLBAR = componentLayout.glassToolbar;
const SPOTLIGHT = componentLayout.excerptMenu;
// The platter shares the gutter the floating header orbs keep off the display edge.
const SIDE_GUTTER = componentLayout.floatingHeader.sidePad;

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SpotlightGlowProps {
  rect: SpotlightRect;
  /** The menu's own open progress, so the rim fades in with the dim rather than snapping on. */
  progress: SharedValue<number>;
}

// Accent hairline on the spotlight with a light drifting around it. A conic-gradient mask driven by the pointer is the
// web recipe; RN has neither conic gradients nor CSS masks, so a rotating band read through a ring mask stands in, and
// the bloom is the same descending alpha ladder expressed as one Fabric multi-layer boxShadow.
function SpotlightGlow({
  rect,
  progress,
}: SpotlightGlowProps): React.ReactElement {
  const { resolved } = useTheme();
  const colors = useThemeColors();
  const spin = useSharedValue(0);
  React.useEffect(() => {
    spin.value = withRepeat(
      withTiming(1, { duration: SPOTLIGHT.glowSpinMs, easing: Easing.linear }),
      -1,
      false,
    );
  }, [spin]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const bandStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));
  // Square sized to the diagonal, so the band still spans the rim whatever the excerpt's proportions.
  const side = Math.hypot(rect.width, rect.height);
  const ring: ViewStyle = {
    borderRadius: SPOTLIGHT.spotlightRadius,
    borderWidth: SPOTLIGHT.glowRingWidth,
  };
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", ...rect }, fadeStyle]}
    >
      <View
        style={[
          StyleSheet.absoluteFillObject,
          ring,
          {
            borderColor: withAlpha(colors.primary, SPOTLIGHT.glowRimAlpha),
            boxShadow: boxShadow.excerptGlow[resolved],
          },
        ]}
      />
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <View
            style={[
              StyleSheet.absoluteFillObject,
              ring,
              { borderColor: "black" },
            ]}
          />
        }
      >
        <Animated.View
          style={[
            {
              position: "absolute",
              width: side,
              height: side,
              left: (rect.width - side) / 2,
              top: (rect.height - side) / 2,
            },
            bandStyle,
          ]}
        >
          <LinearGradient
            colors={[
              withAlpha(colors.primary, 0),
              colors.primary,
              withAlpha(colors.primary, 0),
            ]}
            locations={[0, SPOTLIGHT.glowBandSpan / 2, SPOTLIGHT.glowBandSpan]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </MaskedView>
    </Animated.View>
  );
}

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
  const spotlightRect = useMemo<SpotlightRect>(
    () => ({
      top: anchor.top - SPOTLIGHT.spotlightPadding,
      left: anchor.left - SPOTLIGHT.spotlightPadding,
      width: anchor.width + SPOTLIGHT.spotlightPadding * 2,
      height: anchor.bottom - anchor.top + SPOTLIGHT.spotlightPadding * 2,
    }),
    [anchor],
  );
  // The dim as a spread shadow around a rounded hole: one transparent view over the excerpt, everything outside it
  // darkened. Four bands would leave square corners, and iOS rounds the content it lifts above the dim.
  const dimStyle = useMemo<ViewStyle>(
    () => ({
      position: "absolute",
      ...spotlightRect,
      borderRadius: SPOTLIGHT.spotlightRadius,
      boxShadow: `0 0 0 ${SPOTLIGHT.spotlightSpread}px ${colors.scrimSheet}`,
    }),
    [spotlightRect, colors.scrimSheet],
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
    // Centred on the display rather than leading-aligned to the block: the kit anchors to the content, but a centred
    // bar reads better over a full-width reply. The bar is content-sized, so a full-width row centres it.
    return { top, maxWidth: screenWidth - SIDE_GUTTER * 2 };
  }, [anchor, bottomInset, screenHeight, screenWidth, topInset]);
  if (!mounted) return null;
  return (
    <View
      className="absolute inset-0"
      style={{ zIndex: zLayer.menu }}
      pointerEvents="box-none"
      accessibilityViewIsModal
    >
      {/* Kit ships a "Context Menu - Dimming Overlay", and iOS lifts the pressed content above it — so the dim stops at
          the excerpt instead of covering it, and the whole surface stays the dismiss target. */}
      <RNPressable
        className="absolute inset-0"
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={close}
      >
        <Animated.View pointerEvents="none" style={[dimStyle, scrimStyle]} />
      </RNPressable>
      <SpotlightGlow rect={spotlightRect} progress={progress} />
      <Animated.View
        pointerEvents="box-none"
        style={[
          {
            position: "absolute",
            top: position.top,
            left: 0,
            right: 0,
            alignItems: "center",
          },
          toolbarStyle,
        ]}
      >
        <View style={{ maxWidth: position.maxWidth }}>
          <GlassToolbar actions={actions} />
        </View>
      </Animated.View>
    </View>
  );
});
