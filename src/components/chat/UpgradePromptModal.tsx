// Modal shown when the server gates a model behind a paid plan (CloudAPIError code `subscription_required`).

import * as WebBrowser from "expo-web-browser";
import React, { useCallback } from "react";
import { Modal, Pressable as RNPressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LEGAL_URLS } from "@/lib/api/config";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/lib/theme/ThemeContext";
import { boxShadow, componentLayout } from "@/lib/design/tokens";

export interface UpgradePromptModalProps {
  visible: boolean;
  modelName: string;
  onClose: () => void;
  onPickAnotherModel: () => void;
}

export function UpgradePromptModal({
  visible,
  modelName,
  onClose,
  onPickAnotherModel,
}: UpgradePromptModalProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { resolved } = useTheme();
  const handleUpgrade = useCallback((): void => {
    WebBrowser.openBrowserAsync(LEGAL_URLS.upgrade).catch((err: unknown) => {
      console.error("UpgradePromptModal: failed to open upgrade URL", err);
    });
  }, []);
  const handlePickAnother = useCallback((): void => {
    onPickAnotherModel();
    onClose();
  }, [onPickAnotherModel, onClose]);
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* SafeAreaView insets stay inline because they're runtime values from useSafeAreaInsets — NativeWind can't reach them. */}
      <View
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        className="flex-1 items-center justify-center px-6"
      >
        <RNPressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss dialog"
          onPress={onClose}
          className="absolute inset-0 bg-scrim"
        />
        <View
          className="w-full"
          style={{ maxWidth: componentLayout.alertDialog.width }}
          pointerEvents="box-none"
          accessibilityViewIsModal
          accessibilityLiveRegion="polite"
        >
          {/* §11 alert geometry shared with ConfirmDialog: 300pt card, 34pt radius, 14pt outer padding, sheet shadow ring. */}
          <View
            className="bg-card"
            style={{
              borderRadius: componentLayout.alertDialog.cornerRadius,
              boxShadow: boxShadow.sheet[resolved],
              padding: componentLayout.alertDialog.padding,
            }}
          >
            <View
              style={{
                paddingTop: componentLayout.alertDialog.blockPaddingTop,
                paddingHorizontal: componentLayout.alertDialog.blockPaddingX,
                paddingBottom: componentLayout.alertDialog.blockPaddingBottom,
                gap: componentLayout.alertDialog.blockGap,
              }}
            >
              <Text className="font-sans font-semibold text-headline text-label text-center">
                Subscription required
              </Text>
              <Text className="font-sans text-body text-label-secondary text-center">
                {modelName} is an Ollama Cloud model. Upgrade to use it, or pick
                a different model.
              </Text>
            </View>
            {/* Stacked (not the §11 two-across row) so the longer "Pick another model" label never truncates; 50pt Button lg stands in for the 48pt alert tier — AlertAction stays ConfirmDialog-internal per AGENTS.md. */}
            <View style={{ gap: componentLayout.alertDialog.buttonGap }}>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleUpgrade}
                testID="upgrade-modal-upgrade"
              >
                Upgrade
              </Button>
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onPress={handlePickAnother}
                testID="upgrade-modal-pick-another"
              >
                Pick another model
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
