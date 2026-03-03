export interface TranslationTaskRequest {
  input: string[] | { [key: string]: string | string[] } | string;
  sourceLangCode?: string;
  targetLangCode?: string;
  requireCharging?: boolean;
  requiresWifi?: boolean;
}

export interface TranslationTaskResult {
  translatedTexts: string | string[] | { [key: string]: string | string[] };
  sourceLanguage: string | null;
  targetLanguage: string;
}

export interface BatchTranslationTaskResult {
  translatedTexts: string[] | { [key: string]: string | string[] };
  sourceLanguage: string | null;
  targetLanguage: string;
}

export interface TranslationSheetResult {
  translatedText: string;
}

export interface TranslationSheetRequest {
  input: string;
}

export type TranslationErrorCode =
  | 'INTERNAL_ERROR'
  | 'NO_TEXT_PROVIDED'
  | 'UNSUPPORTED_OS_VERSION'
  | 'INVALID_LANGUAGE'
  | 'TRANSLATION_FAILED'
  | 'MODEL_DOWNLOAD_FAILED'
  | 'LANGUAGE_DETECTION_FAILED'
  | 'UNKNOWN_ERROR';

export interface ExpoTranslateTextModule {
  translateTask(params: TranslationTaskRequest): Promise<BatchTranslationTaskResult>;

  translateSheet(params: TranslationSheetRequest): Promise<TranslationSheetResult>;
}
