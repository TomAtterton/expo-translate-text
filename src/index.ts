import {
  TranslationSheetRequest,
  TranslationTaskRequest,
  TranslationTaskResult,
} from './ExpoTranslateText.types';
import { translateTask, translateSheet, TranslationError } from './ExpoTranslateTextModule';
import { Platform } from 'react-native';

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
    let errorMessage = 'An unknown error occurred during translation.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new TranslationError(errorMessage);
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
    let errorMessage = 'An unknown error occurred during translation.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new TranslationError(errorMessage);
  }
};
