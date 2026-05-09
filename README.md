# expo-translate-text 🌍

`expo-translate-text` is a React Native module for translating text using platform-specific translation APIs. It leverages Apple's **[iOS Translation API](https://developer.apple.com/documentation/translation)** (with **Translation Sheet** available in **iOS 17.4+**) and **[Google ML Kit](https://developers.google.com/ml-kit/language/translation/overview)** on Android for seamless text translation.

![npm](https://img.shields.io/npm/v/expo-translate-text)
![Downloads](https://img.shields.io/npm/dm/expo-translate-text)
![GitHub issues](https://img.shields.io/github/issues/TomAtterton/expo-translate-text)
![GitHub stars](https://img.shields.io/github/stars/TomAtterton/expo-translate-text)
![GitHub license](https://img.shields.io/github/license/TomAtterton/expo-translate-text)


## Demo 💫

![Demo GIF](./resources/Translate_iOS.gif)


## Installation 📦


```sh
expo install expo-translate-text
```

## Platform Support 📱

| Platform  | Translation Task | Translation Sheet |
|-----------|----------------|------------------|
| iOS   | ✅ Supported (iOS 18+)   | ✅ Supported (iOS 17.4+) |
| Android   | ✅ Supported   | ❌ Not Supported |

## Usage 🚀

### Basic Text Translation

```tsx
import { onTranslateTask } from 'expo-translate-text';

const translateText = async () => {
  try {
    const result = await onTranslateTask({
      input: 'Hello, world!',
      sourceLangCode: 'en',
      targetLangCode: 'es',
    });
    console.log(result.translatedTexts); // "¡Hola, mundo!"
  } catch (error) {
    console.error(error);
  }
};
```

### Translation Sheet (iOS Only)


```tsx
import { onTranslateSheet } from 'expo-translate-text';
import { Platform } from 'react-native';

const translateSheet = async () => {
  if (Platform.OS === 'android') {
    console.warn('Sheet translation is not supported on Android.');
    return;
  }

  try {
    const translatedText = await onTranslateSheet({
      input: 'Bonjour tout le monde',
    });
    console.log(translatedText);
  } catch (error) {
    console.error(error);
  }
};
```

## API Reference 📖

### onTranslateTask
Translates a given text or batch of text.

**Request:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `string` \| `string[]` \| `{ [key: string]: string \| string[] }` | Text to be translated. |
| `sourceLangCode?` | `string` | Source language code (e.g., 'en'). If omitted, the source language is auto-detected. |
| `targetLangCode?` | `string` | Target language code (e.g., 'es'). Defaults to `'en'`. |
| `requireCharging?` | `boolean` | Requires device to be charging (Android only). |
| `requiresWifi?` | `boolean` | Requires WiFi for translation (Android only). |

**Response:**

Key              | Type                                                  | Description
--------------- | ----------------------------------------------------- | -------------
`translatedTexts` | `string` \| `string[]` \| `{ [key: string]: string \| string[] }` | The translated text(s).
`sourceLanguage` | `string` \| `null`                                   | The detected or provided source language, or `null` if detection failed.
`targetLanguage` | `string`                                             | The requested target language.

---

### onTranslateSheet (iOS 17.4+)

⚠️ **Not supported on Android or Web**

Translates text using the Translation Sheet API.

**Request:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `string` | The text to be translated. |

**Response:** `string | null` — The translated text, or `null` if the sheet was dismissed without translating.

---

### Error Handling

Both functions throw a `TranslationError` on failure:

```tsx
import { TranslationError } from 'expo-translate-text';

try {
  const result = await onTranslateTask({ input: 'Hello', targetLangCode: 'es' });
} catch (error) {
  if (error instanceof TranslationError) {
    console.error(error.message); // Human-readable error message
    console.error(error.code); // Error code (see table below)
  }
}
```

**Error codes:**

| Code | Description |
|------|-------------|
| `INVALID_PARAMETER` | Missing or invalid input / language code |
| `MODEL_DOWNLOAD_FAILED` | Translation model could not be downloaded (Android) |
| `TEXT_TRANSLATE_FAILED` | Translation of a specific text failed (Android) |
| `LANGUAGE_ID_FAILED` | Language auto-detection failed (Android) |
| `TRANSLATION_IN_PROGRESS` | A translation is already running — concurrent calls are not supported |
| `UNSUPPORTED_PLATFORM` | Called on an unsupported platform (Web) |

## Contributing 🙌

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute.

## License 📜

MIT

Enjoy translating with `expo-translate-text`! 🌎
