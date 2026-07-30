// iOS 27 contextual-menu control group: one glass container whose actions divide it evenly, each icon over a caption.
// Geometry is componentLayout.glassToolbar; the kit's mix-blend fill pair is inexpressible in RN, so the tint token approximates it.

import { type LucideIcon } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { GlassOrb } from "@/components/ui/GlassOrb";
import { Pressable } from "@/components/ui/Pressable";
import { useTheme, useThemeColors } from "@/lib/theme/ThemeContext";
import { baseAnimationDurationMs, springEasing } from "@/lib/design/motion";
import {
  componentLayout,
  iconSize,
  strokeWidth,
  timingsNamed,
} from "@/lib/design/tokens";

const TOOLBAR = componentLayout.glassToolbar;

// One home for the platter height: consumers anchor against this instead of re-deriving it from the internals.
export const glassToolbarHeight = TOOLBAR.itemHeight + TOOLBAR.padY * 2;

export interface GlassToolbarAction {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

export interface GlassToolbarProps {
  actions: GlassToolbarAction[];
}

// Kit shows the picked action filled with the vibrant tertiary fill; ours fades the same tier in on press.
const ToolbarAction = React.memo(function ToolbarAction({
  icon: Icon,
  label,
  onPress,
  accessibilityLabel,
}: GlassToolbarAction): React.ReactElement {
  const colors = useThemeColors();
  const pressed = useSharedValue(0);
  const handlePressIn = (): void => {
    pressed.value = withTiming(1, {
      duration: timingsNamed.press,
      easing: springEasing,
    });
  };
  const handlePressOut = (): void => {
    pressed.value = withTiming(0, {
      duration: baseAnimationDurationMs,
      easing: springEasing,
    });
  };
  const tintStyle = useAnimatedStyle(() => ({ opacity: pressed.value }));
  return (
    // scale locked to 1: a press tint under a scaling child diverges at the edges on Fabric (AGENTS.md §Platform notes).
    // haptic off: the long-press that opened the menu already answered the touch.
    <Pressable
      scale={1}
      haptic={false}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={accessibilityLabel ?? label}
      className="flex-1"
    >
      <View
        className="items-center justify-center"
        style={{
          minHeight: TOOLBAR.itemHeight,
          paddingHorizontal: TOOLBAR.itemPadX,
          paddingVertical: TOOLBAR.itemPadY,
          rowGap: TOOLBAR.iconLabelGap,
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.fillTertiary,
              borderRadius: TOOLBAR.itemRadius,
            },
            tintStyle,
          ]}
        />
        <View
          className="justify-center"
          style={{ height: TOOLBAR.iconRowHeight }}
        >
          <Icon
            size={iconSize.md}
            color={colors.foreground}
            strokeWidth={strokeWidth.medium}
          />
        </View>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className="font-sans text-caption-1 font-medium text-center text-foreground"
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
});

export const GlassToolbar = React.memo(function GlassToolbar({
  actions,
}: GlassToolbarProps): React.ReactElement {
  const { resolved } = useTheme();
  return (
    <GlassOrb
      variant="regular"
      borderRadius={TOOLBAR.radius}
      tintColor={TOOLBAR.tint[resolved]}
      style={{ width: TOOLBAR.containerWidth }}
    >
      <View
        className="flex-row items-center"
        style={{
          paddingHorizontal: TOOLBAR.padX,
          paddingVertical: TOOLBAR.padY,
          columnGap: TOOLBAR.itemGap,
        }}
      >
        {actions.map((action) => (
          <ToolbarAction key={action.label} {...action} />
        ))}
      </View>
    </GlassOrb>
  );
});
