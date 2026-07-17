// Unified bottom-sheet header row — centered headline title with fixed-width left/right slots.

import React from "react";
import { Text, View } from "react-native";
import { size } from "@/lib/design/tokens";

export interface SheetHeaderProps {
  title: string;
  /** Optional left slot (back chevron, close ×, etc). Renders as a 44pt-wide spacer when absent so the title stays centered. */
  left?: React.ReactNode;
  /** Optional right slot (close ×, primary action, etc). Same 44pt-wide spacer fallback. */
  right?: React.ReactNode;
  testID?: string;
}

export function SheetHeader({
  title,
  left,
  right,
  testID,
}: SheetHeaderProps): React.ReactElement {
  return (
    <View
      className="flex-row items-center px-4"
      // Exact 44pt row + slots — Tailwind h-11/w-11 render 38.5px under the 14px rem, so the HIG value flows from the size token.
      style={{ height: size.hitTargetMin }}
      testID={testID}
    >
      <View
        className="items-start justify-center"
        style={{ width: size.hitTargetMin, height: size.hitTargetMin }}
      >
        {left}
      </View>
      <Text
        className="flex-1 text-center font-sans font-semibold text-label text-headline"
        numberOfLines={1}
      >
        {title}
      </Text>
      <View
        className="items-end justify-center"
        style={{ width: size.hitTargetMin, height: size.hitTargetMin }}
      >
        {right}
      </View>
    </View>
  );
}
