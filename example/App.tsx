import React, { useState, useMemo } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { onTranslateTask, onTranslateSheet } from 'expo-translate-text';
import { TranslationTaskResult } from "expo-translate-text/ExpoTranslateText.types";

type LanguageCode = 'it' | 'de' | 'fr' | 'es';
type InputType = 'String' | 'Array' | 'Object';

// Predefined sample inputs:
const SAMPLE_STRING = 'Hello world! This is a sample text to translate.';
const SAMPLE_ARRAY = [
  'Hello world! This is a sample text to translate.',
  'How are you today?',
];
const SAMPLE_OBJECT = {
  greeting: 'Hello world! This is a sample text to translate.',
  question: 'How are you today?',
};

export default function App() {
  /**
   * STATES
   */
      // Which language is currently selected?
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('de');

  // Which input type is currently selected?
  const [selectedInputType, setSelectedInputType] = useState<InputType>('String');

  // Where we store the translation result
  const [translatedResult, setTranslatedResult] = useState<
      string | string[] | { [key: string]: string | string[] }
  >('');

  // Where we store the result of "sheet" translation (iOS only)
  const [sheetResult, setSheetResult] = useState<string>('');

  // Loading states for translation and sheet translation
  const [loading, setLoading] = useState<boolean>(false);
  const [sheetLoading, setSheetLoading] = useState<boolean>(false);

  /**
   *  We generate the translation input based on whichever input type is selected.
   */
  const translationInput = useMemo(() => {
    switch (selectedInputType) {
      case 'Array':
        return SAMPLE_ARRAY;
      case 'Object':
        return SAMPLE_OBJECT;
      default:
        return SAMPLE_STRING;
    }
  }, [selectedInputType]);

  /**
   * HANDLERS
   */
  const handleTranslate = async () => {
    try {
      setTranslatedResult('');
      setLoading(true);
      const result: TranslationTaskResult = await onTranslateTask({
        input: translationInput,
        targetLangCode: selectedLanguage, // e.g., 'de', 'fr', 'it', 'es'
      });
      setTranslatedResult(result.translatedTexts);
    } catch (err) {
      console.error('Translation Error', err);
      Alert.alert('Translation Error', String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleTranslateSheet = async () => {
    // For iOS only. We'll just pass the SAMPLE_STRING or an example text.
    if (Platform.OS !== 'ios') {
      Alert.alert('Not available', 'Sheet translation is only supported on iOS.');
      return;
    }
    try {
      setSheetResult('');
      setSheetLoading(true);
      const result = await onTranslateSheet({ input: SAMPLE_STRING });
      setSheetResult(result);
    } catch (err) {
      console.error('Sheet Translation Error', err);
      Alert.alert('Sheet Translation Error', String(err));
    } finally {
      setSheetLoading(false);
    }
  };

  /**
   * UI RENDERING
   */
  return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <Text style={styles.header}>Translator</Text>
          <Text style={styles.subHeader}>Translate Tasks for React Native</Text>

          {/* Language Selection */}
          <Text style={styles.sectionTitle}>Select Target Language</Text>
          <View style={styles.buttonRow}>
            {(['it', 'fr', 'es', 'de'] as LanguageCode[]).map((lang) => (
                <TouchableOpacity
                    key={lang}
                    style={[
                      styles.pillButton,
                      selectedLanguage === lang && styles.selectedPillButton,
                    ]}
                    onPress={() => setSelectedLanguage(lang)}>
                  <Text
                      style={[
                        styles.pillButtonText,
                        selectedLanguage === lang && styles.selectedPillButtonText,
                      ]}>
                    {lang}
                  </Text>
                </TouchableOpacity>
            ))}
          </View>

          {/* Input Type Selection */}
          <Text style={styles.sectionTitle}>Select Input Type</Text>
          <View style={styles.buttonRow}>
            {(['String', 'Array', 'Object'] as InputType[]).map((type) => (
                <TouchableOpacity
                    key={type}
                    style={[
                      styles.pillButton,
                      selectedInputType === type && styles.selectedPillButton,
                    ]}
                    onPress={() => setSelectedInputType(type)}>
                  <Text
                      style={[
                        styles.pillButtonText,
                        selectedInputType === type && styles.selectedPillButtonText,
                      ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
            ))}
          </View>

          {/* Original Text Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Original Text</Text>
            <Text style={styles.cardText}>
              {typeof translationInput === 'string'
                  ? translationInput
                  : JSON.stringify(translationInput, null, 2)}
            </Text>
          </View>

          {/* Translate Button */}
          <TouchableOpacity
              style={styles.translateButton}
              onPress={handleTranslate}
              disabled={loading}>
            {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.translateButtonText}>Translate</Text>
            )}
          </TouchableOpacity>

          {/* Translated Card (if we have a result) */}
          {translatedResult ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Translated Text</Text>
                <Text style={styles.cardText}>
                  {typeof translatedResult === 'string'
                      ? translatedResult
                      : JSON.stringify(translatedResult, null, 2)}
                </Text>
              </View>
          ) : null}

          {/* iOS-only: Translate Sheet */}
          {Platform.OS === 'ios' && (
              <>
                <Text style={styles.sectionTitle}>Translate Sheet (iOS Only)</Text>
                <TouchableOpacity
                    style={styles.sheetButton}
                    onPress={handleTranslateSheet}
                    disabled={sheetLoading}>
                  {sheetLoading ? (
                      <ActivityIndicator color="#fff" />
                  ) : (
                      <Text style={styles.sheetButtonText}>Translate with Sheet</Text>
                  )}
                </TouchableOpacity>
                {!!sheetResult && (
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>Sheet Translation</Text>
                      <Text style={styles.cardText}>{sheetResult}</Text>
                    </View>
                )}
              </>
          )}
        </ScrollView>
      </SafeAreaView>
  );
}

/**
 * STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  scrollContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subHeader: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    color: '#555',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  pillButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 30,
    backgroundColor: '#eee',
    marginRight: 8,
    marginBottom: 8,
  },
  pillButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  selectedPillButton: {
    backgroundColor: '#4C6EF5',
  },
  selectedPillButtonText: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 6,
  },
  cardText: {
    fontSize: 15,
    color: '#333',
  },
  translateButton: {
    backgroundColor: '#4C6EF5',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  translateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  sheetButton: {
    backgroundColor: '#1AB394',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  sheetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
