// Contextual menu for a long-pressed reply unit — Deep dive / Web search on that excerpt. RN cannot extend iOS's own
// selection menu, so the platter is <GlassToolbar> and this file owns anchoring, the dim behind it, and the transitions.

import { BlurView } from "expo-blur";
import MaskedView from "@react-native-masked-view/masked-view";
import { Globe, Sparkles } from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import {
  Keyboard,
  Platform,
  Pressable as RNPressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
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
import { SpotlightGlow } from "@/components/chat/SpotlightGlow";
import type { SpotlightRect } from "@/lib/types/geometry";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { useTheme, useThemeColors } from "@/lib/theme/ThemeContext";
import { springEasing, surfaceSpring } from "@/lib/design/motion";
import { componentLayout, motion, timings, zLayer } from "@/lib/design/tokens";
import { useUIStore } from "@/lib/stores/ui.store";

const TOOLBAR = componentLayout.glassToolbar;
const SPOTLIGHT = componentLayout.excerptMenu;
// The platter shares the gutter the floating header orbs keep off the display edge.
const SIDE_GUTTER = componentLayout.floatingHeader.sidePad;

// Mask paint, not design colour: MaskedView reads alpha, so this means "show".
const MASK_SHOW = "#000000";

// Everything except the excerpt: a screen-sized rect with the cutout punched out of it.
function dimMaskPath(
  screenWidth: number,
  screenHeight: number,
  rect: SpotlightRect,
  radius: number,
): string {
  const { top, left, width, height } = rect;
  return (
    `M 0 0 H ${screenWidth} V ${screenHeight} H 0 Z ` +
    `M ${left + radius} ${top} H ${left + width - radius} ` +
    `A ${radius} ${radius} 0 0 1 ${left + width} ${top + radius} ` +
    `V ${top + height - radius} ` +
    `A ${radius} ${radius} 0 0 1 ${left + width - radius} ${top + height} ` +
    `H ${left + radius} ` +
    `A ${radius} ${radius} 0 0 1 ${left} ${top + height - radius} ` +
    `V ${top + radius} ` +
    `A ${radius} ${radius} 0 0 1 ${left + radius} ${top} Z`
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
  const { resolved } = useTheme();
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
  const dimMask = useMemo(
    () =>
      dimMaskPath(
        screenWidth,
        screenHeight,
        spotlightRect,
        SPOTLIGHT.spotlightRadius,
      ),
    [screenWidth, screenHeight, spotlightRect],
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
      {/* Kit ships a "Context Menu - Dimming Overlay", and iOS lifts the pressed content above it — so the dim and its
          blur stop at the excerpt, which stays sharp and unshaded. The whole surface is the dismiss target. */}
      <RNPressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={close}
      />
      <MaskedView
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        maskElement={
          <Svg width={screenWidth} height={screenHeight}>
            <Path d={dimMask} fill={MASK_SHOW} fillRule="evenodd" />
          </Svg>
        }
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.scrimExcerpt },
            scrimStyle,
          ]}
        >
          {/* iOS only, as the sheet scrim does — Android's blur fallback is too uneven to dim with. */}
          {Platform.OS === "ios" ? (
            <BlurView
              tint={resolved === "dark" ? "dark" : "light"}
              intensity={SPOTLIGHT.dimBlurIntensity}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          ) : null}
        </Animated.View>
      </MaskedView>
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
