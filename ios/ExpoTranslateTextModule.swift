import ExpoModulesCore
import SwiftUI

#if canImport(Translation)
    import Translation
#endif

public class ExpoTranslateTextModule: Module {
    private var hostingController: UIHostingController<AnyView>?
    private var isTranslating = false

    public func definition() -> ModuleDefinition {
        Name("ExpoTranslateText")

        AsyncFunction("translateSheet") {
            [weak self] (params: [String: Any]) async throws -> [String: Any] in
            guard let self = self else { throw ModuleDeallocatedException() }
            guard !self.isTranslating else { throw TranslationInProgressException() }
            self.isTranslating = true

            let textToTranslate = params["input"] as? String ?? ""

            guard !textToTranslate.isEmpty else {
                self.isTranslating = false
                throw InvalidParameterException()
            }

            let sheetProps = await MainActor.run {
                let props = SheetProps()
                props.text = textToTranslate
                return props
            }

            if #available(iOS 17.4, *) {
                return try await withCheckedThrowingContinuation { continuation in
                    Task { @MainActor in
                        sheetProps.onHide = {
                            self.isTranslating = false
                            self.dismissTranslationView()
                            if sheetProps.didTranslate {
                                continuation.resume(returning: ["translatedText": sheetProps.text, "cancelled": false])
                            } else {
                                continuation.resume(returning: ["translatedText": "", "cancelled": true])
                            }
                        }
                        sheetProps.isPresented = true
                        self.presentTranslationSheet(sheetProps)
                    }
                }
            } else {
                self.isTranslating = false
                throw UnsupportedOSVersionException("17.4")
            }
        }

        AsyncFunction("translateTask") {
            [weak self] (params: [String: Any]) async throws -> [String: Any] in
            guard let self = self else { throw ModuleDeallocatedException() }
            guard !self.isTranslating else { throw TranslationInProgressException() }
            self.isTranslating = true

            let (texts, inputType, dictMapping) = parseTexts(from: params)
            guard !texts.isEmpty else {
                self.isTranslating = false
                throw InvalidParameterException()
            }

            let targetLangCode = params["targetLangCode"] as? String ?? "en"
            let sourceLangCode = params["sourceLangCode"] as? String

            let props = await MainActor.run {
                let p = Props()
                p.texts = texts
                p.targetLanguage = targetLangCode
                p.sourceLanguage = sourceLangCode
                return p
            }

            if #available(iOS 18.0, *) {
                await MainActor.run { self.presentTranslationView(props) }
                return try await withCheckedThrowingContinuation { continuation in
                    Task { @MainActor in
                        props.onSuccess = { translatedTexts, detectedSourceLanguage in
                            self.isTranslating = false
                            let resolvedSourceLanguage = sourceLangCode ?? detectedSourceLanguage
                            let result: [String: Any]
                            if inputType == .dictionary, let mapping = dictMapping {
                                var resultDict: [String: Any] = [:]
                                for (key, value) in mapping {
                                    let indices = value.indices
                                    if value.isArray {
                                        let arr = indices.map { translatedTexts[$0] }
                                        resultDict[key] = arr
                                    } else {
                                        if let index = indices.first {
                                            resultDict[key] = translatedTexts[index]
                                        }
                                    }
                                }
                                result = [
                                    "translatedTexts": resultDict,
                                    "sourceLanguage": resolvedSourceLanguage as Any,
                                    "targetLanguage": targetLangCode,
                                ]
                            } else if inputType == .string {
                                result = [
                                    "translatedTexts": translatedTexts.first ?? "",
                                    "sourceLanguage": resolvedSourceLanguage as Any,
                                    "targetLanguage": targetLangCode,
                                ]
                            } else {
                                result = [
                                    "translatedTexts": translatedTexts,
                                    "sourceLanguage": resolvedSourceLanguage as Any,
                                    "targetLanguage": targetLangCode,
                                ]
                            }
                            continuation.resume(returning: result)
                            self.dismissTranslationView()
                        }

                        props.onError = { errorMessage in
                            self.isTranslating = false
                            continuation.resume(throwing: NSError(
                                domain: "ExpoIosTranslateModule",
                                code: 2,
                                userInfo: [NSLocalizedDescriptionKey: errorMessage]
                            ))
                            self.dismissTranslationView()
                        }
                    }
                }
            } else {
                self.isTranslating = false
                throw UnsupportedOSVersionException("18.0")
            }
        }
    }

    // MARK: - Private Helpers for Managing SwiftUI Views
    @MainActor
    private func presentTranslationView(_ props: Props) {
        let controller = UIHostingController(rootView: AnyView(IOSTranslateTasks(props: props)))
        hostingController = controller

        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
            let rootVC = windowScene.windows.first?.rootViewController
        {
            rootVC.addChild(controller)
            rootVC.view.addSubview(controller.view)
            controller.view.frame = CGRect(x: 0, y: 0, width: 1, height: 1)
            controller.view.isHidden = true
            controller.didMove(toParent: rootVC)
        }
    }

    @MainActor
    private func presentTranslationSheet(_ props: SheetProps) {
        let controller = UIHostingController(rootView: AnyView(IOSTranslateSheet(props: props)))
        hostingController = controller

        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
            let rootVC = windowScene.windows.first?.rootViewController
        {
            rootVC.addChild(controller)
            rootVC.view.addSubview(controller.view)
            controller.view.frame = CGRect(x: 0, y: 0, width: 1, height: 1)
            controller.view.isHidden = true
            controller.didMove(toParent: rootVC)
        }
    }

    @MainActor
    private func dismissTranslationView() {
        if let controller = hostingController {
            controller.view.removeFromSuperview()
            controller.removeFromParent()
            hostingController = nil
        }
    }
}
