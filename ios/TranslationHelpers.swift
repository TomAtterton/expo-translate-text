import ExpoModulesCore
import Foundation
#if canImport(Translation)
import Translation
#endif
import SwiftUI

// MARK: - Exceptions

internal final class ModuleDeallocatedException: Exception, @unchecked Sendable {
  override var reason: String { "Module deallocated" }
}

internal final class InvalidParameterException: Exception, @unchecked Sendable {
  override var reason: String { "No text provided for translation" }
}

internal final class InvalidSourceLanguageException: Exception, @unchecked Sendable {
  override var reason: String { "A sourceLangCode is required when preparing translation" }
}

internal final class TranslationInProgressException: Exception, @unchecked Sendable {
  override var reason: String { "A translation is already in progress" }
}

internal final class UnsupportedOSVersionException: Exception, @unchecked Sendable {
  private let minimumVersion: String
  init(_ minimumVersion: String) {
    self.minimumVersion = minimumVersion
    super.init()
  }
  override var reason: String { "Translation is only supported on iOS \(minimumVersion) or newer" }
}

// MARK: - Helper Types & Functions

enum InputType {
  case string, array, dictionary
}

/// For dictionary inputs, record whether the original value was an array and the indices in the flattened texts array.
typealias DictMapping = [String: (isArray: Bool, indices: [Int])]

/// Parses the "texts" parameter.
/// - Returns: A tuple containing the flattened texts array, the input type, and an optional dictionary mapping.
func parseTexts(from params: [String: Any]) -> (texts: [String], inputType: InputType, dictMapping: DictMapping?) {
  if let text = params["input"] as? String {
    return ([text], .string, nil)
  }

  if let textsArray = params["input"] as? [String] {
    return (textsArray, .array, nil)
  }

  if let textsDict = params["input"] as? [String: Any] {
    var mapping: DictMapping = [:]
    var allTexts: [String] = []

    for (key, value) in textsDict {
      if let str = value as? String {
        mapping[key] = (isArray: false, indices: [allTexts.count])
        allTexts.append(str)
      } else if let strArray = value as? [String] {
        let startIndex = allTexts.count
        allTexts.append(contentsOf: strArray)
        let indices = Array(startIndex..<startIndex + strArray.count)
        mapping[key] = (isArray: true, indices: indices)
      }
    }
    return (allTexts, .dictionary, mapping)
  }

  return ([], .array, nil)
}

@available(iOS 18.0, *)
func makeConfiguration(
  sourceLanguage: String?,
  targetLanguage: String?,
  preferredStrategy: String?
) -> TranslationSession.Configuration {
  let source = sourceLanguage.map { Locale.Language(identifier: $0) }
  let target = targetLanguage.map { Locale.Language(identifier: $0) }

  if #available(iOS 26.4, *), let preferredStrategy {
    return TranslationSession.Configuration(
      source: source,
      target: target,
      preferredStrategy: makePreferredStrategy(preferredStrategy)
    )
  }

  return TranslationSession.Configuration(source: source, target: target)
}

@available(iOS 18.0, *)
@MainActor
func makeConfiguration(from props: Props) -> TranslationSession.Configuration {
  return makeConfiguration(
    sourceLanguage: props.sourceLanguage,
    targetLanguage: props.targetLanguage,
    preferredStrategy: props.preferredStrategy
  )
}

@available(iOS 18.0, *)
@MainActor
func makeConfiguration(from props: PrepareProps) -> TranslationSession.Configuration {
  return makeConfiguration(
    sourceLanguage: props.sourceLanguage,
    targetLanguage: props.targetLanguage,
    preferredStrategy: props.preferredStrategy
  )
}

@available(iOS 26.4, *)
private func makePreferredStrategy(_ preferredStrategy: String) -> TranslationSession.Strategy {
  switch preferredStrategy {
  case "highFidelity":
    return .highFidelity
  default:
    return .lowLatency
  }
}
