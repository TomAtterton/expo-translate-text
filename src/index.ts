// Reexport the native module. On web, it will be resolved to ExpoTranslateTextModule.web.ts
// and on native platforms to ExpoTranslateTextModule.ts
export { default } from './ExpoTranslateTextModule';
export { default as ExpoTranslateTextView } from './ExpoTranslateTextView';
export * from  './ExpoTranslateText.types';
