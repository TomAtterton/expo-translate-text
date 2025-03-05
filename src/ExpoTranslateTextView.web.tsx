import * as React from 'react';

import { ExpoTranslateTextViewProps } from './ExpoTranslateText.types';

export default function ExpoTranslateTextView(props: ExpoTranslateTextViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
