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
| `sourceLangCode?` | `string` | Source language code (e.g., 'en'). |
| `targetLangCode` | `string` | Target language code (e.g., 'es'). |
| `requireCharging?` | `boolean` | Requires device to be charging. |
| `requiresWifi?` | `boolean` | Requires WiFi for translation. |

**Response:**

Key              | Type                                                  | Description
--------------- | ----------------------------------------------------- | -------------
`translatedTexts` | `string` \| `string[]` \| `{ [key: string]: string \| string[] }` | The translated text(s).
`sourceLanguage` | `string` \| `null`                                   | The detected source language, or `null` if unknown.
`targetLanguage` | `string`                                             | The requested target language.

---

### onTranslateSheet (iOS 17.4+)

⚠️ **Not supported on Android**

Translates text using the Translation Sheet API.

**Request:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `string` | The text to be translated. |

**Response:**

Key    | Type     | Description
------ | ------- | -------------
`result` | `string` | The translated text.

## Contributing 🙌

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute.

## License 📜

MIT

Enjoy translating with `expo-translate-text`! 🌎
