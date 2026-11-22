import { Platform } from 'react-native';

import type {
  LanguageAvailabilityRequest,
  LanguageAvailabilityStatus,
  PrepareTranslationRequest,
  PrepareTranslationResult,
  TranslationSheetRequest,
  TranslationTaskRequest,
  TranslationTaskResult,
} from './ExpoTranslateText.types';
import {
  getLanguageAvailability,
  getSupportedLanguages,
  prepareTranslation,
  translateTask,
  translateSheet,
  TranslationError,
} from './ExpoTranslateTextModule';

export { TranslationError } from './ExpoTranslateTextModule';
export type {
  LanguageAvailabilityRequest,
  LanguageAvailabilityStatus,
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

export const onGetSupportedLanguages = async (): Promise<string[]> => {
  try {
    return await getSupportedLanguages();
  } catch (error: unknown) {
    let errorMessage = 'An unknown error occurred while getting supported languages.';
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

export const onGetLanguageAvailability = async ({
  sourceLangCode,
  targetLangCode,
  preferredStrategy,
}: LanguageAvailabilityRequest): Promise<LanguageAvailabilityStatus> => {
  try {
    const result = await getLanguageAvailability({
      sourceLangCode,
      targetLangCode,
      preferredStrategy,
    });
    return result.status;
  } catch (error: unknown) {
    let errorMessage = 'An unknown error occurred while checking language availability.';
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
