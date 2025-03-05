package expo.modules.translatetext

import android.os.Build
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.languageid.LanguageIdentification
import com.google.mlkit.nl.languageid.LanguageIdentificationOptions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicInteger

class ExpoTranslateTextModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoTranslateText")

    AsyncFunction("translateTask") { params: Map<String, Any>, promise: Promise ->
      translateTask(params, promise)
    }
  }

  private fun translateTask(params: Map<String, Any>, promise: Promise) {
    try {
      val textsInput = params["input"] ?: throw CodedException(
        code = "INVALID_PARAMETER",
        message = "No texts provided",
        cause = null
      )

      // 2) Validate the target language
      val targetLangCode = params["targetLangCode"] as? String
        ?: throw CodedException(
          code = "INVALID_PARAMETER",
          message = "Target language code is missing",
          cause = null
        )
      val targetLanguage = TranslateLanguage.fromLanguageTag(targetLangCode)
        ?: throw CodedException(
          code = "INVALID_PARAMETER",
          message = "Invalid target language: $targetLangCode",
          cause = null
        )

      // 3) Optional source language (could be "auto")
      val sourceLangCode = params["sourceLangCode"] as? String
      val fixedSourceLanguage: String? = if (sourceLangCode != null && sourceLangCode != "auto") {
        TranslateLanguage.fromLanguageTag(sourceLangCode)
          ?: throw CodedException(
            code = "INVALID_PARAMETER",
            message = "Invalid source language: $sourceLangCode",
            cause = null
          )
      } else null

      // 4) Configure download conditions
      val requiresWifi = params["requiresWifi"] as? Boolean ?: false
      val requireCharging = params["requireCharging"] as? Boolean ?: false

      val conditionsBuilder = DownloadConditions.Builder()
      if (requiresWifi) {
        conditionsBuilder.requireWifi()
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && requireCharging) {
        conditionsBuilder.requireCharging()
      }
      val conditions = conditionsBuilder.build()

      // 5) Convert user input into a map of "key" -> List<String>
      val textsMap = extractTexts(textsInput)

      // 6) Build an initial output structure that matches the shape of 'textsInput'
      var translatedTexts = buildInitialOutputStructure(textsInput)

      // 7) Track the detected languages for each key
      val detectedLanguages = mutableMapOf<String, String>()

      // 8) Create a language identifier (for auto detection)
      val languageIdentifier = LanguageIdentification.getClient(
        LanguageIdentificationOptions.Builder()
          .setConfidenceThreshold(0.5f)
          .build()
      )

      // 9) Dictionary of translators keyed by "sourceLang-targetLang"
      val translators = mutableMapOf<String, com.google.mlkit.nl.translate.Translator>()

      // 10) Figure out the total steps for concurrency
      val totalStringCount = textsMap.values.sumOf { it.size }
      val pendingCountValue = if (fixedSourceLanguage != null) {
        // 1 (download) + N (translations)
        totalStringCount + 1
      } else {
        // For each string: 1 detection + 1 download + 1 translation = 3
        totalStringCount * 3
      }
      val pendingCount = AtomicInteger(pendingCountValue)

      // 11) Completion handler. When pendingCount hits 0 => return result
      val completionHandler: () -> Unit = {
        val remaining = pendingCount.decrementAndGet()
        if (remaining == 0) {
          // All done => close resources, resolve
          translators.values.forEach { it.close() }
          languageIdentifier.close()

          // Determine a single "sourceLanguage" string
          val finalSourceLanguage: String = if (fixedSourceLanguage != null) {
            // We already know which source was used
            fixedSourceLanguage
          } else {
            // Auto detection => see if all detected languages are the same
            val uniqueLangs = detectedLanguages.values.toSet()
            if (uniqueLangs.size == 1) {
              uniqueLangs.first()
            } else {
              "multiple" // or pick the most frequent, etc.
            }
          }

          promise.resolve(
            mapOf(
              "translatedTexts" to translatedTexts,
              "detectedLanguages" to detectedLanguages,
              "targetLanguage" to targetLangCode,
              // Return a single "sourceLanguage" string
              "sourceLanguage" to finalSourceLanguage
            )
          )

        } else if (remaining < 0) {
          // Should never go negative => indicates concurrency error
          translators.values.forEach { it.close() }
          languageIdentifier.close()
          promise.reject(
            CodedException(
              code = "INTERNAL_ERROR",
              message = "Task count went negative: $remaining",
              cause = null
            )
          )
        }
      }

      // 12) Translate function for a single string
      val translateText: (key: String, text: String, sourceLang: String) -> Unit =
        { key, text, sourceLang ->
          val translatorKey = "$sourceLang-$targetLanguage"
          val translator = translators.getOrPut(translatorKey) {
            Translation.getClient(
              TranslatorOptions.Builder()
                .setSourceLanguage(sourceLang)
                .setTargetLanguage(targetLanguage)
                .build()
            )
          }

          translator.downloadModelIfNeeded(conditions)
            .addOnSuccessListener {
              // Download done => 1 step
              completionHandler()

              translator.translate(text)
                .addOnSuccessListener { translatedText ->
                  synchronized(translatedTexts) {
                    // Insert into the correct shape
                    when (translatedTexts) {
                      is String -> {
                        // If top-level was originally just one string
                        translatedTexts = translatedText
                      }
                      is MutableList<*> -> {
                        // If top-level was an array
                        (translatedTexts as MutableList<String>).add(translatedText)
                      }
                      is MutableMap<*, *> -> {
                        // If top-level was an object
                        val existingValue = (translatedTexts as MutableMap<String, Any>)[key]
                        when (existingValue) {
                          is String -> {
                            // This key was originally a single string
                            if (existingValue.isEmpty()) {
                              (translatedTexts as MutableMap<String, Any>)[key] = translatedText
                            } else {
                              // Overwrite or something else
                              (translatedTexts as MutableMap<String, Any>)[key] = translatedText
                            }
                          }
                          is MutableList<*> -> {
                            // This key was originally an array
                            (existingValue as MutableList<String>).add(translatedText)
                          }
                        }
                      }
                    }
                    // Record the source language for this key
                    detectedLanguages[key] = sourceLang
                  }
                  // Translation done => 1 step
                  completionHandler()
                }
                .addOnFailureListener { e ->
                  translators.values.forEach { it.close() }
                  languageIdentifier.close()
                  promise.reject(
                    CodedException(
                      code = "TEXT_TRANSLATE_FAILED",
                      message = e.message ?: "Translation failed for text: $text",
                      cause = e
                    )
                  )
                }
            }
            .addOnFailureListener { e ->
              translators.values.forEach { it.close() }
              languageIdentifier.close()
              promise.reject(
                CodedException(
                  code = "MODEL_DOWNLOAD_FAILED",
                  message = e.message ?: "Model download failed for $sourceLang-$targetLanguage",
                  cause = e
                )
              )
            }
        }

      // 13) Function to process all keys/strings in 'textsMap'
      val processTexts: () -> Unit = {
        if (textsMap.isEmpty()) {
          completionHandler()
        } else {
          for ((key, listOfStrings) in textsMap) {
            for (singleString in listOfStrings) {
              if (fixedSourceLanguage != null) {
                // If we already know the source => just translate
                translateText(key, singleString, fixedSourceLanguage)
              } else {
                // Otherwise => auto detect first => 1 step
                languageIdentifier.identifyLanguage(singleString)
                  .addOnSuccessListener { langCode ->
                    completionHandler() // language ID done
                    val detectedLangCode = if (langCode == "und") "en" else langCode
                    val sourceLang = TranslateLanguage.fromLanguageTag(detectedLangCode) ?: "en"
                    translateText(key, singleString, sourceLang)
                  }
                  .addOnFailureListener { e ->
                    translators.values.forEach { it.close() }
                    languageIdentifier.close()
                    promise.reject(
                      CodedException(
                        code = "LANGUAGE_ID_FAILED",
                        message = e.message ?: "Language identification failed for text: $singleString",
                        cause = e
                      )
                    )
                  }
              }
            }
          }
        }
      }

      // 14) If fixed source => pre-download once. Otherwise, start processTexts immediately.
      if (fixedSourceLanguage != null) {
        val translator = Translation.getClient(
          TranslatorOptions.Builder()
            .setSourceLanguage(fixedSourceLanguage)
            .setTargetLanguage(targetLanguage)
            .build()
        )
        translators["fixed"] = translator
        translator.downloadModelIfNeeded(conditions)
          .addOnSuccessListener {
            completionHandler() // single model download done
            processTexts()
          }
          .addOnFailureListener { e ->
            translators.values.forEach { it.close() }
            languageIdentifier.close()
            promise.reject(
              CodedException(
                code = "MODEL_DOWNLOAD_FAILED",
                message = e.message ?: "Model download failed",
                cause = e
              )
            )
          }
      } else {
        processTexts()
      }

    } catch (e: CodedException) {
      promise.reject(e)
    } catch (e: Exception) {
      promise.reject(
        CodedException(
          code = "PARAMETER_ERROR",
          message = e.message ?: "Unknown error",
          cause = e
        )
      )
    }
  }

  /**
   * Convert user input (string | string[] | { [key]: string|string[] }) into a map
   * of "key" -> list of strings. This unifies everything for easy iteration.
   */
  private fun extractTexts(input: Any): Map<String, List<String>> {
    return when (input) {
      is String -> {
        // Single string => one map entry "0" => listOf(thatString)
        mapOf("0" to listOf(input))
      }
      is List<*> -> {
        // If top-level is an array, store everything under "0"
        val stringList = input.filterIsInstance<String>()
        mapOf("0" to stringList)
      }
      is Map<*, *> -> {
        // If top-level is an object, each value can be string or string[]
        input.entries.associate { (k, v) ->
          val key = k.toString()
          val listOfStrings: List<String> = when (v) {
            is String -> listOf(v)
            is List<*> -> v.filterIsInstance<String>()
            else -> emptyList()
          }
          key to listOfStrings
        }
      }
      else -> emptyMap()
    }
  }

  /**
   * Build a container that has the same top-level shape as 'input'.
   *  - Single string => "" (an empty string)
   *  - Array => mutableListOf<String>()
   *  - Object => map of key-> ("" or mutableListOf<String>), depending on original type
   */
  private fun buildInitialOutputStructure(input: Any): Any {
    return when (input) {
      is String -> {
        ""
      }
      is List<*> -> {
        mutableListOf<String>()
      }
      is Map<*, *> -> {
        val outputMap = mutableMapOf<String, Any>()
        for ((k, v) in input) {
          val key = k.toString()
          when (v) {
            is String -> outputMap[key] = ""
            is List<*> -> outputMap[key] = mutableListOf<String>()
            else -> outputMap[key] = ""
          }
        }
        outputMap
      }
      else -> {
        ""
      }
    }
  }
}
