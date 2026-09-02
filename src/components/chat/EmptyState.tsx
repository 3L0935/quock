// Shown when a chat has zero messages: a centered hero inviting the user to start typing. The Chat/Agent pill sits
// under the caption, and in agent mode the caption explains what the mode adds so the choice reads, not just the label.

import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { springEasing } from "@/lib/design/motion";
import { EMPTY_STATE_FADE_MS } from "@/modules/chat/constants";

export interface EmptyStateProps {
  // Drives the hero caption (agent mode explains what it adds on every new thread).
  agentEnabled: boolean;
}

export function EmptyState({
  agentEnabled,
}: EmptyStateProps): React.ReactElement {
  // Hero fade-in driven by explicit shared value so it fires once at mount, not on every parent re-render.
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: EMPTY_STATE_FADE_MS,
      easing: springEasing,
    });
  }, [opacity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[animatedStyle]} className="flex-1 justify-end pb-4">
      {/* iOS 27 empty state: 22pt message/description pair — semibold primary over medium secondary. */}
      <View className="flex-1 items-center justify-center px-6">
        <Text className="font-sans font-semibold text-title-2 text-foreground text-center">
          Start a conversation
        </Text>
        <Text className="font-sans font-medium text-title-2 text-muted-foreground text-center max-w-65">
          {agentEnabled
            ? "The agent can use tools and remembers what matters across chats."
            : "Ask anything to get started."}
        </Text>
      </View>
    </Animated.View>
  );
}
