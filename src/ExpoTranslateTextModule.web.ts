import { registerWebModule, NativeModule } from 'expo';

import { ExpoTranslateTextModuleEvents } from './ExpoTranslateText.types';

class ExpoTranslateTextModule extends NativeModule<ExpoTranslateTextModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(ExpoTranslateTextModule);
