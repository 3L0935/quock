// Floating action pill anchored above (or below) the long-pressed reply block — Deep dive / Web search on that excerpt.
// Not a native menu (RN can't add items to iOS's selection menu); built from GlassOrb to match the app's iOS-26 pills.

import { Globe, Sparkles } from "lucide-react-native";
import React from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassOrb } from "@/components/ui/GlassOrb";
import { useThemeColors } from "@/lib/theme/ThemeContext";
import { componentLayout, iconSize, strokeWidth } from "@/lib/design/tokens";
import { useUIStore } from "@/lib/stores/ui.store";

// Approx pill height, gap to the unit, and the composer band kept clear at the bottom.
const PILL_HEIGHT = 44;
const PILL_GAP = 8;
const COMPOSER_BAND = 96;

export interface ExcerptPillProps {
  canWebSearch: boolean;
  onDeepDive: (text: string) => void;
  onWebSearch: (text: string) => void;
}

export function ExcerptPill({
  canWebSearch,
  onDeepDive,
  onWebSearch,
}: ExcerptPillProps): React.ReactElement | null {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const open = useUIStore((s) => s.excerptPillOpen);
  const text = useUIStore((s) => s.excerptPillText);
  const unitTop = useUIStore((s) => s.excerptPillTop);
  const unitBottom = useUIStore((s) => s.excerptPillBottom);
  const close = useUIStore((s) => s.closeExcerptPill);
  if (!open) return null;
  // Prefer above the unit; drop below when the header would clip it; clamp above the composer band.
  const safeTop = insets.top + componentLayout.floatingHeader.height;
  const safeBottom = screenH - insets.bottom - COMPOSER_BAND;
  const above = unitTop - PILL_GAP - PILL_HEIGHT;
  let top: number;
  if (above >= safeTop) {
    top = above;
  } else {
    const below = unitBottom + PILL_GAP;
    top =
      below + PILL_HEIGHT <= safeBottom
        ? below
        : Math.max(safeTop, safeBottom - PILL_HEIGHT);
  }
  return (
    <Pressable
      className="absolute inset-0"
      accessibilityLabel="Dismiss"
      onPress={close}
    >
      <View
        pointerEvents="box-none"
        className="flex-row gap-2"
        style={{
          position: "absolute",
          top,
          left: 0,
          right: 0,
          justifyContent: "center",
        }}
      >
        <GlassOrb
          variant="regular"
          interactive
          onPress={(): void => onDeepDive(text)}
          borderRadius={999}
          accessibilityLabel="Deep dive on this"
        >
          <View className="flex-row items-center gap-1.5 py-2 px-3.5">
            <Sparkles
              size={iconSize.sm}
              color={colors.foreground}
              strokeWidth={strokeWidth.medium}
            />
            <Text className="font-sans text-sm text-foreground">Deep dive</Text>
          </View>
        </GlassOrb>
        {canWebSearch ? (
          <GlassOrb
            variant="regular"
            interactive
            onPress={(): void => onWebSearch(text)}
            borderRadius={999}
            accessibilityLabel="Web search on this"
          >
            <View className="flex-row items-center gap-1.5 py-2 px-3.5">
              <Globe
                size={iconSize.sm}
                color={colors.foreground}
                strokeWidth={strokeWidth.medium}
              />
              <Text className="font-sans text-sm text-foreground">
                Web search
              </Text>
            </View>
          </GlassOrb>
        ) : null}
      </View>
    </Pressable>
  );
}
