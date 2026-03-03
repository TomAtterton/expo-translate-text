import { Platform } from 'react-native';

import {
  TranslationErrorCode,
  TranslationSheetRequest,
  TranslationTaskRequest,
  TranslationTaskResult,
} from './ExpoTranslateText.types';
import { translateTask, translateSheet, TranslationError } from './ExpoTranslateTextModule';

export { TranslationError, TranslationErrorCode };

// iOS uses numeric codes, Android uses string codes
// Map both to our unified TranslationErrorCode
const IOS_ERROR_CODE_MAP: Record<number, TranslationErrorCode> = {
  0: 'INTERNAL_ERROR',       // Module deallocated
  3: 'NO_TEXT_PROVIDED',     // No text provided
  2: 'TRANSLATION_FAILED',   // Translation error
  [-1]: 'UNSUPPORTED_OS_VERSION', // iOS version too low
};

const ANDROID_ERROR_CODE_MAP: Record<string, TranslationErrorCode> = {
  'INVALID_PARAMETER': 'INVALID_LANGUAGE',
  'INTERNAL_ERROR': 'INTERNAL_ERROR',
  'TEXT_TRANSLATE_FAILED': 'TRANSLATION_FAILED',
  'MODEL_DOWNLOAD_FAILED': 'MODEL_DOWNLOAD_FAILED',
  'LANGUAGE_ID_FAILED': 'LANGUAGE_DETECTION_FAILED',
  'PARAMETER_ERROR': 'UNKNOWN_ERROR',
};

function extractErrorCode(error: unknown): TranslationErrorCode {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;

    // Android: string codes
    if (typeof code === 'string' && code in ANDROID_ERROR_CODE_MAP) {
      return ANDROID_ERROR_CODE_MAP[code];
    }

    // iOS: numeric codes
    if (typeof code === 'number' && code in IOS_ERROR_CODE_MAP) {
      return IOS_ERROR_CODE_MAP[code];
    }
  }
  return 'UNKNOWN_ERROR';
}

export const onTranslateTask = async ({
  input,
  sourceLangCode,
  targetLangCode,
  requireCharging,
  requiresWifi,
}: TranslationTaskRequest): Promise<TranslationTaskResult> => {
  try {
    return await translateTask({
      input,
      sourceLangCode,
      targetLangCode,
      requiresWifi,
      requireCharging,
    });
  } catch (error: unknown) {
    const errorCode = extractErrorCode(error);
    let errorMessage = 'An unknown error occurred during translation.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new TranslationError(errorMessage, errorCode);
  }
};

export const onTranslateSheet = async ({ input }: TranslationSheetRequest): Promise<string> => {
  try {
    if (Platform.OS === 'android') {
      throw new Error('Sheet translation is not supported on Android.');
    }
    const response = await translateSheet({ input });
    return response.translatedText;
  } catch (error: unknown) {
    const errorCode = extractErrorCode(error);
    let errorMessage = 'An unknown error occurred during translation.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new TranslationError(errorMessage, errorCode);
  }
};
