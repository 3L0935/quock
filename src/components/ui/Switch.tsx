// Boolean toggle with iOS 27 geometry (wide track, white pill knob) — values flow through `componentLayout.toggleSwitch`, `motion`, `shadow`.

import React, { useEffect } from "react";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import { useThemeColors } from "@/lib/theme/ThemeContext";
import {
  baseAnimationDurationMs,
  springEasing,
  toggleSpring,
} from "@/lib/design/motion";
import { componentLayout, motion, shadow } from "@/lib/design/tokens";

export interface SwitchProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}
const S = componentLayout.toggleSwitch;
// Knob max translateX, derived from the token geometry so the pill lands flush against the far inset.
const KNOB_TRAVEL = S.trackWidth - S.knobWidth - S.inset * 2;

export function Switch({
  value,
  onValueChange,
  disabled = false,
  testID,
  accessibilityLabel,
}: SwitchProps): React.ReactElement {
  const colors = useThemeColors();
  // Track crossfades on timing (smooth color), thumb travels on spring (settled overshoot).
  const trackProgress = useSharedValue(value ? 1 : 0);
  const thumbProgress = useSharedValue(value ? 1 : 0);
  // OFF = solid system fill inside the surface, ON = the semantic toggle green.
  const offColor = colors.fillSecondary;
  const onColor = colors.toggleOn;
  useEffect(() => {
    trackProgress.value = withTiming(value ? 1 : 0, {
      duration: baseAnimationDurationMs,
      easing: springEasing,
    });
    thumbProgress.value = withSpring(value ? 1 : 0, toggleSpring);
  }, [value, trackProgress, thumbProgress]);
  // Clamp the spring overshoot so the thumb never visually exits the track.
  const thumbX = useDerivedValue(
    () =>
      Math.min(
        1 + motion.thumbOvershoot,
        Math.max(-motion.thumbOvershoot, thumbProgress.value),
      ) * KNOB_TRAVEL,
  );
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      trackProgress.value,
      [0, 1],
      [offColor, onColor],
    ),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));
  const handlePress = (): void => {
    if (disabled) return;
    onValueChange(!value);
  };
  return (
    // Disable press-scale so only the knob animates; Pressable supplies haptics, hit area, and the disabled opacity tier.
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      scale={1}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <Animated.View
        style={[
          {
            width: S.trackWidth,
            height: S.trackHeight,
            borderRadius: S.trackHeight / 2,
            padding: S.inset,
            justifyContent: "center",
          },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: S.knobWidth,
              height: S.knobHeight,
              borderRadius: S.knobHeight / 2,
              backgroundColor: colors.thumbFill,
              shadowColor: colors.shadow,
              shadowOpacity: shadow.thumb.opacity,
              shadowRadius: shadow.thumb.radius,
              shadowOffset: { width: 0, height: shadow.thumb.offsetY },
              elevation: shadow.thumb.elevation,
            },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
