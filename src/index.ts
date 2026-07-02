import { Platform } from 'react-native';

import type {
  PrepareTranslationRequest,
  PrepareTranslationResult,
  TranslationSheetRequest,
  TranslationTaskRequest,
  TranslationTaskResult,
} from './ExpoTranslateText.types';
import {
  prepareTranslation,
  translateTask,
  translateSheet,
  TranslationError,
} from './ExpoTranslateTextModule';

export { TranslationError } from './ExpoTranslateTextModule';
export type {
  PrepareTranslationRequest,
  PrepareTranslationResult,
  TranslationStrategy,
  TranslationTaskRequest,
  TranslationTaskResult,
  TranslationSheetRequest,
} from './ExpoTranslateText.types';

export const onTranslateTask = async ({
  input,
  sourceLangCode,
  targetLangCode,
  preferredStrategy,
  requireCharging,
  requiresWifi,
}: TranslationTaskRequest): Promise<TranslationTaskResult> => {
  try {
    return await translateTask({
      input,
      sourceLangCode,
      targetLangCode,
      preferredStrategy,
      requiresWifi,
      requireCharging,
    });
  } catch (error: unknown) {
    let errorMessage = 'An unknown error occurred during translation.';
    let errorCode: string | number | undefined;
    if (error instanceof Error) {
      errorMessage = error.message;
      if ('code' in error) {
        errorCode = (error as TranslationError).code;
      }
    }
    throw new TranslationError(errorMessage, errorCode);
  }
};

export const onTranslateSheet = async ({
  input,
}: TranslationSheetRequest): Promise<string | null> => {
  try {
    if (Platform.OS === 'android') {
      throw new Error('Sheet translation is not supported on Android.');
    }
    const response = await translateSheet({ input });
    return response.cancelled ? null : response.translatedText;
  } catch (error: unknown) {
    let errorMessage = 'An unknown error occurred during translation.';
    let errorCode: string | number | undefined;
    if (error instanceof Error) {
      errorMessage = error.message;
      if ('code' in error) {
        errorCode = (error as TranslationError).code;
      }
    }
    throw new TranslationError(errorMessage, errorCode);
  }
};

export const onPrepareTranslation = async (
  params: PrepareTranslationRequest,
): Promise<PrepareTranslationResult> => {
  if (Platform.OS !== 'ios') {
    throw new TranslationError(
      'Preparing Apple translation is only supported on iOS.',
      'UNSUPPORTED_PLATFORM',
    );
  }

  try {
    const result = await prepareTranslation(params);
    return result.cancelled ? { status: 'cancelled' } : { status: 'prepared' };
  } catch (error: unknown) {
    let errorMessage = 'An unknown error occurred while preparing translation.';
    let errorCode: string | number | undefined;
    if (error instanceof Error) {
      errorMessage = error.message;
      if ('code' in error) {
        errorCode = (error as TranslationError).code;
      }
    }
    const translationError = new TranslationError(errorMessage, errorCode);
    throw translationError;
  }
};
