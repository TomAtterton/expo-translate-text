import { requireNativeView } from 'expo';
import * as React from 'react';

import { ExpoTranslateTextViewProps } from './ExpoTranslateText.types';

const NativeView: React.ComponentType<ExpoTranslateTextViewProps> =
  requireNativeView('ExpoTranslateText');

export default function ExpoTranslateTextView(props: ExpoTranslateTextViewProps) {
  return <NativeView {...props} />;
}
