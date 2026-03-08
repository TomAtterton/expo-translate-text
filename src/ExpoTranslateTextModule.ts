import { requireNativeModule } from 'expo-modules-core';
import { ExpoTranslateTextModule } from './ExpoTranslateText.types';

export class TranslationError extends Error {
  code?: string | number;

  constructor(message: string, code?: string | number) {
    super(message);
    this.name = 'TranslationError';
    this.code = code;
  }
}

const ExpoIosTranslate = requireNativeModule<ExpoTranslateTextModule>('ExpoTranslateText');

export const translateTask = ExpoIosTranslate.translateTask;
export const translateSheet = ExpoIosTranslate.translateSheet;
