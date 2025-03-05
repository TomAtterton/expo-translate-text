import { requireNativeModule } from 'expo-modules-core';
import { ExpoTranslateTextModule } from './ExpoTranslateText.types';

export class TranslationError extends Error {
  code?: number;

  constructor(message: string, code?: number) {
    super(message);
    this.name = 'TranslationError';
    this.code = code;
  }
}

const ExpoIosTranslate = requireNativeModule<ExpoTranslateTextModule>('ExpoTranslateText');

export const translateTask = ExpoIosTranslate.translateTask;
export const translateSheet = ExpoIosTranslate.translateSheet;
