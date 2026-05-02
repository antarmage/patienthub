import { KeyboardProvider } from "react-native-keyboard-controller";
import React from "react";

export function KeyboardWrapper({ children }: { children: React.ReactNode }) {
  return <KeyboardProvider>{children}</KeyboardProvider>;
}
