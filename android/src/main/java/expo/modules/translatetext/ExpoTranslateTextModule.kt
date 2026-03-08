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
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

class ExpoTranslateTextModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoTranslateText")

    AsyncFunction("translateTask") { params: Map<String, Any>, promise: Promise ->
      translateTask(params, promise)
    }
  }

  /**
   * Represents a single text to translate, with metadata to reconstruct the output.
   */
  private data class TranslationItem(
    val flatIndex: Int,
    val key: String,
    val text: String,
    val indexInKey: Int,
    val isArrayValue: Boolean
  )

  private fun translateTask(params: Map<String, Any>, promise: Promise) {
    try {
      val textsInput = params["input"] ?: throw CodedException(
        code = "INVALID_PARAMETER",
        message = "No texts provided",
        cause = null
      )

      // Validate or default the target language
      val targetLangCode = params["targetLangCode"] as? String ?: "en"
      val targetLanguage = TranslateLanguage.fromLanguageTag(targetLangCode)
        ?: throw CodedException(
          code = "INVALID_PARAMETER",
          message = "Invalid target language: $targetLangCode",
          cause = null
        )

      // Optional source language (could be "auto")
      val sourceLangCode = params["sourceLangCode"] as? String
      val fixedSourceLanguage: String? = if (sourceLangCode != null && sourceLangCode != "auto") {
        TranslateLanguage.fromLanguageTag(sourceLangCode)
          ?: throw CodedException(
            code = "INVALID_PARAMETER",
            message = "Invalid source language: $sourceLangCode",
            cause = null
          )
      } else null

      // Configure download conditions
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

      // Extract all texts into a flat list with positional metadata
      val items = extractItems(textsInput)
      if (items.isEmpty()) {
        throw CodedException(
          code = "INVALID_PARAMETER",
          message = "No texts provided",
          cause = null
        )
      }

      // Flat results array — each item writes to its own index
      val results = Array(items.size) { "" }

      // Track detected source languages per item
      val detectedLanguages = mutableMapOf<Int, String>()

      // Guard against multiple promise settlements
      val settled = AtomicBoolean(false)

      // Language identifier for auto detection
      val languageIdentifier = LanguageIdentification.getClient(
        LanguageIdentificationOptions.Builder()
          .setConfidenceThreshold(0.5f)
          .build()
      )

      // Reusable translators keyed by "sourceLang-targetLang"
      val translators = mutableMapOf<String, com.google.mlkit.nl.translate.Translator>()

      // Pending step count
      val totalSteps = if (fixedSourceLanguage != null) {
        // 1 model download + N translations
        items.size + 1
      } else {
        // Per item: 1 detect + 1 download + 1 translate = 3
        items.size * 3
      }
      val pendingCount = AtomicInteger(totalSteps)

      // Cleanup helper
      val cleanup: () -> Unit = {
        translators.values.forEach { it.close() }
        languageIdentifier.close()
      }

      // Safe reject — only settles the promise once
      val safeReject: (String, String, Throwable?) -> Unit = { code, message, cause ->
        if (settled.compareAndSet(false, true)) {
          cleanup()
          promise.reject(CodedException(code = code, message = message, cause = cause))
        }
      }

      // Completion handler — decrements pending count, resolves when 0
      val completionHandler: () -> Unit = {
        val remaining = pendingCount.decrementAndGet()
        if (remaining == 0 && settled.compareAndSet(false, true)) {
          cleanup()

          val finalSourceLanguage: String? = if (fixedSourceLanguage != null) {
            fixedSourceLanguage
          } else {
            val uniqueLangs = detectedLanguages.values.toSet()
            when {
              uniqueLangs.size == 1 -> uniqueLangs.first()
              uniqueLangs.isNotEmpty() -> "multiple"
              else -> null
            }
          }

          // Reconstruct output matching the original input shape
          val translatedTexts = reconstructOutput(textsInput, items, results)

          promise.resolve(
            mapOf(
              "translatedTexts" to translatedTexts,
              "targetLanguage" to targetLangCode,
              "sourceLanguage" to finalSourceLanguage
            )
          )
        }
      }

      // Translate a single item
      val translateItem: (TranslationItem, String) -> Unit = { item, sourceLang ->
        val translatorKey = "$sourceLang-$targetLanguage"
        val translator = synchronized(translators) {
          translators.getOrPut(translatorKey) {
            Translation.getClient(
              TranslatorOptions.Builder()
                .setSourceLanguage(sourceLang)
                .setTargetLanguage(targetLanguage)
                .build()
            )
          }
        }

        translator.downloadModelIfNeeded(conditions)
          .addOnSuccessListener {
            completionHandler() // download step done

            translator.translate(item.text)
              .addOnSuccessListener { translatedText ->
                results[item.flatIndex] = translatedText
                synchronized(detectedLanguages) {
                  detectedLanguages[item.flatIndex] = sourceLang
                }
                completionHandler() // translate step done
              }
              .addOnFailureListener { e ->
                safeReject("TEXT_TRANSLATE_FAILED", e.message ?: "Translation failed for: ${item.text}", e)
              }
          }
          .addOnFailureListener { e ->
            safeReject("MODEL_DOWNLOAD_FAILED", e.message ?: "Model download failed for $sourceLang-$targetLanguage", e)
          }
      }

      // Process all items
      val processItems: () -> Unit = {
        for (item in items) {
          if (fixedSourceLanguage != null) {
            translateItem(item, fixedSourceLanguage)
          } else {
            languageIdentifier.identifyLanguage(item.text)
              .addOnSuccessListener { langCode ->
                completionHandler() // detect step done
                val detectedLangCode = if (langCode == "und") "en" else langCode
                val sourceLang = TranslateLanguage.fromLanguageTag(detectedLangCode) ?: "en"
                translateItem(item, sourceLang)
              }
              .addOnFailureListener { e ->
                safeReject("LANGUAGE_ID_FAILED", e.message ?: "Language identification failed for: ${item.text}", e)
              }
          }
        }
      }

      // If fixed source, pre-download the model once, then process
      if (fixedSourceLanguage != null) {
        val translator = Translation.getClient(
          TranslatorOptions.Builder()
            .setSourceLanguage(fixedSourceLanguage)
            .setTargetLanguage(targetLanguage)
            .build()
        )
        synchronized(translators) {
          translators["fixed"] = translator
        }
        translator.downloadModelIfNeeded(conditions)
          .addOnSuccessListener {
            completionHandler() // single model download done
            processItems()
          }
          .addOnFailureListener { e ->
            safeReject("MODEL_DOWNLOAD_FAILED", e.message ?: "Model download failed", e)
          }
      } else {
        processItems()
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
   * Flatten input into a list of TranslationItems with positional metadata.
   */
  private fun extractItems(input: Any): List<TranslationItem> {
    var flatIndex = 0
    return when (input) {
      is String -> {
        listOf(TranslationItem(flatIndex = 0, key = "0", text = input, indexInKey = 0, isArrayValue = false))
      }
      is List<*> -> {
        input.filterIsInstance<String>().mapIndexed { index, text ->
          TranslationItem(flatIndex = flatIndex++, key = "0", text = text, indexInKey = index, isArrayValue = true)
        }
      }
      is Map<*, *> -> {
        val items = mutableListOf<TranslationItem>()
        for ((k, v) in input) {
          val key = k.toString()
          when (v) {
            is String -> {
              items.add(TranslationItem(flatIndex = flatIndex++, key = key, text = v, indexInKey = 0, isArrayValue = false))
            }
            is List<*> -> {
              v.filterIsInstance<String>().forEachIndexed { index, text ->
                items.add(TranslationItem(flatIndex = flatIndex++, key = key, text = text, indexInKey = index, isArrayValue = true))
              }
            }
          }
        }
        items
      }
      else -> emptyList()
    }
  }

  /**
   * Reconstruct the output to match the original input shape using the flat results array.
   */
  private fun reconstructOutput(input: Any, items: List<TranslationItem>, results: Array<String>): Any {
    return when (input) {
      is String -> results[0]
      is List<*> -> results.toList()
      is Map<*, *> -> {
        val outputMap = mutableMapOf<String, Any>()
        // Group items by key and reconstruct
        for (item in items) {
          if (item.isArrayValue) {
            val list = outputMap.getOrPut(item.key) { mutableListOf<String>() }
            if (list is MutableList<*>) {
              @Suppress("UNCHECKED_CAST")
              (list as MutableList<String>).add(results[item.flatIndex])
            }
          } else {
            outputMap[item.key] = results[item.flatIndex]
          }
        }
        outputMap
      }
      else -> results[0]
    }
  }
}
