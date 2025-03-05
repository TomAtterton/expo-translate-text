import Foundation
#if canImport(Translation)
import Translation
#endif
import SwiftUI

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

/// Converts an Error into a friendly string.
/// - Parameter error: The error to convert.
/// - Returns: A user-friendly error message.
@available(iOS 18.0, *)
func friendlyErrorMessage(from error: Error) -> String {
  if let translationError = error as? TranslationError {
    return translationError.errorDescription ?? "A translation error occurred."
  }
  return error.localizedDescription
}

@available(iOS 18.0, *)
@MainActor
func makeConfiguration(from props: Props) -> TranslationSession.Configuration {
  return TranslationSession.Configuration(
    source: props.sourceLanguage.map { Locale.Language(identifier: $0) },
    target: props.targetLanguage.map { Locale.Language(identifier: $0) }
  )
}
