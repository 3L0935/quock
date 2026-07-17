// Grouped list block with an optional sentence-case header label.

import React, { type ReactNode } from "react";
import { Text, View } from "react-native";
import clsx from "clsx";
import { componentLayout } from "@/lib/design/tokens";

export interface SectionProps {
  label?: string;
  children: ReactNode;
  /** Wrap children in the legacy `bg-card rounded-xl` card. Defaults to false. */
  card?: boolean;
  className?: string;
  testID?: string;
}
function SectionImpl({
  label,
  children,
  card = false,
  className,
  testID,
}: SectionProps): React.ReactElement {
  return (
    <View className={clsx("mb-6", className)} testID={testID}>
      {label ? (
        // iOS 27 grouped-list header: Body semibold sentence case in the secondary tint (the uppercase footnote eyebrow was the classic style). 16pt inset flows from the token — ml-4.5 renders 18.
        <Text
          className="font-sans font-semibold text-body text-muted-foreground mb-2"
          style={{ marginLeft: componentLayout.listSection.insetX }}
        >
          {label}
        </Text>
      ) : null}
      {card ? (
        // 26pt iOS 27 inset-grouped rounding — exact pt lives in tokens (rounded-* tiers are rem-derived).
        <View
          className="bg-card overflow-hidden"
          style={{ borderRadius: componentLayout.listSection.cardRadius }}
        >
          {children}
        </View>
      ) : (
        <View>{children}</View>
      )}
    </View>
  );
}

export const Section = React.memo(SectionImpl);
