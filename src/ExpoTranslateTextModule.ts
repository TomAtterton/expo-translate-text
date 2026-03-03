import { requireNativeModule } from 'expo-modules-core';
import { ExpoTranslateTextModule, TranslationErrorCode, TranslationTaskRequest } from './ExpoTranslateText.types';
import { Platform } from 'react-native';

export class TranslationError extends Error {
  code: TranslationErrorCode;

  constructor(message: string, code: TranslationErrorCode = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'TranslationError';
    this.code = code;
  }
}

const ExpoTranslateText = requireNativeModule<ExpoTranslateTextModule>('ExpoTranslateText');

export const translateTask = (params: TranslationTaskRequest) => {
  if (Platform.OS === 'android') {
    // Android native module accepts individual typed params to avoid
    // Expo Modules bridge serialization issues with Map<String, Any>
    return (ExpoTranslateText as any).translateTask(
      JSON.stringify(params.input),
      params.targetLangCode ?? '',
      params.sourceLangCode ?? null,
      params.requiresWifi ?? false,
      params.requireCharging ?? false,
    );
  }
  return ExpoTranslateText.translateTask(params);
};
export const translateSheet = ExpoTranslateText.translateSheet;
