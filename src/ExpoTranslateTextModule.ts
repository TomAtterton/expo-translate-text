import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

import type { ExpoTranslateTextModule } from './ExpoTranslateText.types';

export class TranslationError extends Error {
  code?: string | number;

  constructor(message: string, code?: string | number) {
    super(message);
    this.name = 'TranslationError';
    this.code = code;
  }
}

const ExpoIosTranslate =
  Platform.OS !== 'web' ? requireNativeModule<ExpoTranslateTextModule>('ExpoTranslateText') : null;

export const translateTask =
  ExpoIosTranslate?.translateTask ??
  (() => {
    throw new TranslationError(
      'expo-translate-text is not supported on web.',
      'UNSUPPORTED_PLATFORM',
    );
  });
export const translateSheet =
  ExpoIosTranslate?.translateSheet ??
  (() => {
    throw new TranslationError(
      'expo-translate-text is not supported on web.',
      'UNSUPPORTED_PLATFORM',
    );
  });
export const prepareTranslation =
  ExpoIosTranslate?.prepareTranslation ??
  (() => {
    throw new TranslationError(
      'expo-translate-text is not supported on web.',
      'UNSUPPORTED_PLATFORM',
    );
  });
export const getSupportedLanguages =
  ExpoIosTranslate?.getSupportedLanguages ??
  (() => {
    throw new TranslationError(
      'expo-translate-text is not supported on web.',
      'UNSUPPORTED_PLATFORM',
    );
  });
export const getLanguageAvailability =
  ExpoIosTranslate?.getLanguageAvailability ??
  (() => {
    throw new TranslationError(
      'expo-translate-text is not supported on web.',
      'UNSUPPORTED_PLATFORM',
    );
  });
