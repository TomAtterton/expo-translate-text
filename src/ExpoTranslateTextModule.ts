import { NativeModule, requireNativeModule } from 'expo';

import { ExpoTranslateTextModuleEvents } from './ExpoTranslateText.types';

declare class ExpoTranslateTextModule extends NativeModule<ExpoTranslateTextModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ExpoTranslateTextModule>('ExpoTranslateText');
