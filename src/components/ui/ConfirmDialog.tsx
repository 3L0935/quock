// Absolute-overlay dialog — render inside a Sheet `overlays` slot so `inset-0` resolves to the full display.

import clsx from "clsx";
import React, { useEffect } from "react";
import { Pressable as RNPressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useThemeColors } from "@/lib/theme/ThemeContext";
import { baseAnimationDurationMs, surfaceSpring } from "@/lib/design/motion";
import { Pressable } from "@/components/ui/Pressable";
import { componentLayout, motion, shadow, zLayer } from "@/lib/design/tokens";
import { TextField } from "@/components/ui/TextField";

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  // When provided, renders a single-line input above the actions (e.g. rename flow). Value is controlled by the caller.
  inputValue?: string;
  onChangeInput?: (value: string) => void;
  inputPlaceholder?: string;
  confirmDisabled?: boolean;
  testID?: string;
}

interface AlertActionProps {
  label: string;
  onPress: () => void;
  surfaceClass: string;
  labelClass: string;
  disabled?: boolean;
}
// iOS 27 alert action pill — the 48pt alert tier sits between Button md/lg, so the alert owns its
// action recipe as the one sanctioned exception to the <Button>-for-CTAs rule (AGENTS.md §How to add things).
function AlertAction({
  label,
  onPress,
  surfaceClass,
  labelClass,
  disabled = false,
}: AlertActionProps): React.ReactElement {
  return (
    // Surface lives on the wrapper: Pressable paints className on two nested views, which would double a translucent fill.
    <View
      className={clsx("flex-1 rounded-full overflow-hidden", surfaceClass)}
      style={{ height: componentLayout.alertDialog.buttonHeight }}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        className="flex-1 items-center justify-center"
      >
        <Text className={clsx("font-sans font-semibold text-body", labelClass)}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
  inputValue,
  onChangeInput,
  inputPlaceholder,
  confirmDisabled = false,
  testID,
}: ConfirmDialogProps): React.ReactElement | null {
  const colors = useThemeColors();
  // Card scales from motion.scaleDialogFrom to 1 on a spring, giving the modal a confident pop on entrance.
  const scale = useSharedValue(visible ? 1 : motion.scaleDialogFrom);
  const cardOpacity = useSharedValue(visible ? 1 : 0);
  useEffect(() => {
    scale.value = withSpring(
      visible ? 1 : motion.scaleDialogFrom,
      surfaceSpring,
    );
    cardOpacity.value = withTiming(visible ? 1 : 0, {
      duration: baseAnimationDurationMs,
    });
  }, [visible, scale, cardOpacity]);
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: cardOpacity.value,
  }));
  if (!visible) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(baseAnimationDurationMs)}
      exiting={FadeOut.duration(baseAnimationDurationMs)}
      className="absolute inset-0 items-center justify-center px-6"
      style={{ zIndex: zLayer.dialog }}
      pointerEvents="auto"
      testID={testID}
    >
      <RNPressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss dialog"
        onPress={onCancel}
        className="absolute inset-0 bg-scrim"
      />
      <Animated.View
        // Shadow on the wrapper so the inner `overflow: hidden` card doesn't clip it.
        style={[
          {
            width: "100%",
            maxWidth: componentLayout.alertDialog.width,
            shadowColor: colors.shadow,
            shadowOpacity: shadow.dialog.opacity,
            shadowRadius: shadow.dialog.radius,
            shadowOffset: { width: 0, height: shadow.dialog.offsetY },
            elevation: shadow.dialog.elevation,
          },
          cardAnimatedStyle,
        ]}
        pointerEvents="box-none"
        accessibilityViewIsModal
        accessibilityLiveRegion="polite"
      >
        {/* Near-opaque card material — iOS 27 alerts stay readable over any underlying content (sheets, screens, photos); a frosted blur inside a Modal added weight without payoff. */}
        <View
          className="bg-card"
          style={{
            borderRadius: componentLayout.alertDialog.cornerRadius,
            overflow: "hidden",
          }}
        >
          <View style={{ padding: componentLayout.alertDialog.padding }}>
            <Text
              className="pt-2 px-2 font-sans font-semibold text-headline text-label text-center"
              numberOfLines={1}
            >
              {title}
            </Text>
            {message !== undefined ? (
              <Text className="mt-1 px-2 font-sans text-body text-label-secondary text-center">
                {message}
              </Text>
            ) : null}
            {onChangeInput !== undefined ? (
              <View className="mt-3.5 w-full">
                {/* Multiline (maxLines=3) instead of single-line: a long pre-filled value on iOS Fabric renders as a static UILabel (which wraps) until the input is focused, then snaps back to single-line — we couldn't stop it across three rewrites. Multiline lets the box grow with the content so the title is fully visible without that flicker. */}
                <TextField
                  value={inputValue ?? ""}
                  onChangeText={onChangeInput}
                  placeholder={inputPlaceholder}
                  autoCapitalize="sentences"
                  multiline
                  maxLines={3}
                  testID="confirm-dialog-input"
                  // iOS 27 alert field: system-fill capsule at the alert geometry; grows past minHeight up to maxLines.
                  containerClassName="bg-fill-secondary justify-center"
                  containerStyle={{
                    borderRadius: componentLayout.alertDialog.textFieldRadius,
                    minHeight: componentLayout.alertDialog.textFieldHeight,
                  }}
                  className="text-body px-4"
                />
              </View>
            ) : null}
            <View
              className="flex-row mt-4"
              style={{ gap: componentLayout.alertDialog.buttonGap }}
            >
              <AlertAction
                label={cancelLabel}
                onPress={onCancel}
                surfaceClass="bg-fill-secondary"
                labelClass="text-label"
              />
              {/* Destructive role = red label on the neutral fill — iOS alerts never paint a solid red action. */}
              <AlertAction
                label={confirmLabel}
                onPress={onConfirm}
                disabled={confirmDisabled}
                surfaceClass={destructive ? "bg-fill-secondary" : "bg-primary"}
                labelClass={
                  destructive ? "text-destructive" : "text-primary-foreground"
                }
              />
            </View>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
