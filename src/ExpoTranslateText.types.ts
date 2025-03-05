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

export interface ExpoTranslateTextModule {
  translateTask(params: TranslationTaskRequest): Promise<BatchTranslationTaskResult>;

  translateSheet(params: TranslationSheetRequest): Promise<TranslationSheetResult>;
}
