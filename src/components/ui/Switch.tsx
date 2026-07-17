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
  pressSpring,
  springEasing,
  toggleSpring,
} from "@/lib/design/motion";
import { componentLayout, motion, shadow, size } from "@/lib/design/tokens";

export interface SwitchProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}
const S = componentLayout.toggleSwitch;
// Vertical slop lifts the 28pt track to the 44pt HIG hit target (width already exceeds it).
const HIT_SLOP_Y = (size.hitTargetMin - S.trackHeight) / 2;

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
  // 0..1 press-state: the knob stretches while the finger is down (iOS pressed variant).
  const pressProgress = useSharedValue(0);
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
  // Clamp the spring overshoot so the thumb never visually exits the track. Travel derives from the
  // live knob width, so the press-stretch stays anchored to the active edge (translateX shrinks as width grows).
  const knobWidth = useDerivedValue(
    () => S.knobWidth + pressProgress.value * S.knobStretch,
  );
  const thumbX = useDerivedValue(
    () =>
      Math.min(
        1 + motion.thumbOvershoot,
        Math.max(-motion.thumbOvershoot, thumbProgress.value),
      ) *
      (S.trackWidth - knobWidth.value - S.inset * 2),
  );
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      trackProgress.value,
      [0, 1],
      [offColor, onColor],
    ),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    width: knobWidth.value,
    transform: [{ translateX: thumbX.value }],
  }));
  const handlePress = (): void => {
    if (disabled) return;
    onValueChange(!value);
  };
  const handlePressIn = (): void => {
    pressProgress.value = withSpring(1, pressSpring);
  };
  const handlePressOut = (): void => {
    pressProgress.value = withSpring(0, pressSpring);
  };
  return (
    // Disable press-scale so only the knob animates; Pressable supplies haptics, hit area, and the disabled opacity tier.
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      scale={1}
      hitSlop={{ top: HIT_SLOP_Y, bottom: HIT_SLOP_Y }}
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
