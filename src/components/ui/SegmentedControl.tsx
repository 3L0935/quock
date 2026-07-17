// N-option iOS 27 segmented control — fill-tertiary pill track with a sliding selected-option pill.

import clsx from "clsx";
import React, { useEffect, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useThemeColors } from "@/lib/theme/ThemeContext";
import { toggleSpring } from "@/lib/design/motion";
import { componentLayout, shadow } from "@/lib/design/tokens";

export interface SegmentedOption {
  label: string;
  value: string;
}

export type SegmentedControlSize = "default" | "compact";
export interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (v: string) => void;
  size?: SegmentedControlSize;
  disabled?: boolean;
  className?: string;
  testID?: string;
  accessibilityLabel?: string;
}

const SC = componentLayout.segmentedControl;
// iOS 27 track tiers: default = 50pt standalone control, compact = 32pt tier that fits a ListRow trailing slot.
const TRACK_HEIGHTS: Record<SegmentedControlSize, number> = {
  default: SC.trackHeightLarge,
  compact: SC.trackHeightSmall,
};

export function SegmentedControl({
  options,
  value,
  onChange,
  size = "default",
  disabled = false,
  className,
  testID,
  accessibilityLabel,
}: SegmentedControlProps): React.ReactElement {
  const colors = useThemeColors();
  // Indicator positions in absolute px; hidden until first layout measurement arrives.
  const [width, setWidth] = useState<number>(0);
  // Inner width = track minus the inset on each side and the inter-option gaps, so option cells and indicator share one grid.
  const innerWidth = Math.max(
    0,
    width - SC.indicatorInset * 2 - SC.optionGap * Math.max(0, options.length - 1),
  );
  const segmentWidth = options.length > 0 ? innerWidth / options.length : 0;
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const progress = useSharedValue(selectedIndex);
  // Spring with overshoot — replaces the timing-cut for the iOS feel.
  useEffect(() => {
    progress.value = withSpring(selectedIndex, toggleSpring);
  }, [selectedIndex, progress]);
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (segmentWidth + SC.optionGap) }],
    width: segmentWidth,
  }));
  const handleLayout = (e: LayoutChangeEvent): void => {
    setWidth(e.nativeEvent.layout.width);
  };
  // Percentage fallback paints an approximate first frame until onLayout delivers exact px widths — Fabric+Pressable drops `flex: 1` here, so widths stay explicit.
  const segmentPercent: `${number}%` =
    options.length > 0 ? `${100 / options.length}%` : "100%";
  return (
    <View
      onLayout={handleLayout}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      className={clsx(
        "bg-fill-tertiary rounded-full flex-row relative",
        disabled && "opacity-50",
        className,
      )}
      style={{
        height: TRACK_HEIGHTS[size],
        padding: SC.indicatorInset,
        columnGap: SC.optionGap,
      }}
    >
      {/* Hidden until width is measured so the first paint is not misaligned. */}
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          className="absolute bg-segmented-selected rounded-full"
          style={[
            {
              top: SC.indicatorInset,
              bottom: SC.indicatorInset,
              left: SC.indicatorInset,
              shadowColor: colors.shadow,
              shadowOpacity: shadow.control.opacity,
              shadowRadius: shadow.control.radius,
              shadowOffset: { width: 0, height: shadow.control.offsetY },
              elevation: shadow.control.elevation,
            },
            indicatorStyle,
          ]}
        />
      ) : null}
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          // Static style on the Pressable (no callback) since Fabric drops styles from callbacks; the inner View centers the Text via its own layout.
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            disabled={disabled}
            style={{ width: width > 0 ? segmentWidth : segmentPercent }}
          >
            <View className="flex-1 items-center justify-center">
              <Text
                className={clsx(
                  // Both states use the primary label tint — iOS marks selection with the pill + weight, not color.
                  "text-footnote text-label",
                  isSelected ? "font-semibold" : "font-medium",
                )}
              >
                {opt.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
