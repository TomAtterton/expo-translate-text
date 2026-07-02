export interface TranslationTaskRequest {
  input: string[] | { [key: string]: string | string[] } | string;
  sourceLangCode?: string;
  targetLangCode?: string;
  preferredStrategy?: TranslationStrategy;
  requireCharging?: boolean;
  requiresWifi?: boolean;
}

export type TranslationStrategy = 'lowLatency' | 'highFidelity';

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
  cancelled: boolean;
}

export interface TranslationSheetRequest {
  input: string;
}

export interface PrepareTranslationRequest {
  sourceLangCode: string;
  targetLangCode?: string;
  preferredStrategy?: TranslationStrategy;
}

export type PrepareTranslationResult = { status: 'prepared' } | { status: 'cancelled' };

export interface NativePrepareTranslationResult {
  prepared: boolean;
  cancelled: boolean;
}

export interface ExpoTranslateTextModule {
  translateTask(params: TranslationTaskRequest): Promise<BatchTranslationTaskResult>;

  translateSheet(params: TranslationSheetRequest): Promise<TranslationSheetResult>;

  prepareTranslation(params: PrepareTranslationRequest): Promise<NativePrepareTranslationResult>;
}
