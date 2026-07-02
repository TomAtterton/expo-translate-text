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
            try await MainActor.run {
                try self.beginTranslation()
            }

            let textToTranslate = params["input"] as? String ?? ""

            guard !textToTranslate.isEmpty else {
                await MainActor.run {
                    self.finishTranslation()
                }
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
                        var didSettle = false

                        let reject: (String) -> Void = { errorMessage in
                            guard !didSettle else { return }
                            didSettle = true
                            self.finishTranslation()
                            continuation.resume(throwing: NSError(
                                domain: "ExpoIosTranslateModule",
                                code: 1,
                                userInfo: [NSLocalizedDescriptionKey: errorMessage]
                            ))
                            self.dismissTranslationView()
                        }

                        sheetProps.onHide = {
                            guard !didSettle else { return }
                            didSettle = true
                            self.finishTranslation()
                            self.dismissTranslationView()
                            if sheetProps.didTranslate {
                                continuation.resume(returning: ["translatedText": sheetProps.text, "cancelled": false])
                            } else {
                                continuation.resume(returning: ["translatedText": "", "cancelled": true])
                            }
                        }
                        sheetProps.isPresented = true
                        if !self.presentTranslationSheet(sheetProps) {
                            reject("Unable to present translation sheet.")
                        }
                    }
                }
            } else {
                await MainActor.run {
                    self.finishTranslation()
                }
                throw UnsupportedOSVersionException("17.4")
            }
        }

        AsyncFunction("translateTask") {
            [weak self] (params: [String: Any]) async throws -> [String: Any] in
            guard let self = self else { throw ModuleDeallocatedException() }
            try await MainActor.run {
                try self.beginTranslation()
            }

            let (texts, inputType, dictMapping) = parseTexts(from: params)
            guard !texts.isEmpty else {
                await MainActor.run {
                    self.finishTranslation()
                }
                throw InvalidParameterException()
            }

            let targetLangCode = params["targetLangCode"] as? String ?? "en"
            let sourceLangCode = params["sourceLangCode"] as? String
            let preferredStrategy = params["preferredStrategy"] as? String

            let props = await MainActor.run {
                let p = Props()
                p.texts = texts
                p.targetLanguage = targetLangCode
                p.sourceLanguage = sourceLangCode
                p.preferredStrategy = preferredStrategy
                return p
            }

            if #available(iOS 18.0, *) {
                return try await withCheckedThrowingContinuation { continuation in
                    Task { @MainActor in
                        var didSettle = false

                        let reject: (String) -> Void = { errorMessage in
                            guard !didSettle else { return }
                            didSettle = true
                            self.finishTranslation()
                            continuation.resume(throwing: NSError(
                                domain: "ExpoIosTranslateModule",
                                code: 2,
                                userInfo: [NSLocalizedDescriptionKey: errorMessage]
                            ))
                            self.dismissTranslationView()
                        }

                        props.onSuccess = { translatedTexts, detectedSourceLanguage in
                            guard !didSettle else { return }
                            didSettle = true
                            self.finishTranslation()
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
                            reject(errorMessage)
                        }

                        props.onCancel = {
                            reject("Translation was cancelled before completing.")
                        }

                        if !self.presentTranslationView(props) {
                            reject("Unable to present translation view.")
                        }
                    }
                }
            } else {
                await MainActor.run {
                    self.finishTranslation()
                }
                throw UnsupportedOSVersionException("18.0")
            }
        }

        AsyncFunction("prepareTranslation") {
            [weak self] (params: [String: Any]) async throws -> [String: Any] in
            guard let self = self else { throw ModuleDeallocatedException() }
            try await MainActor.run {
                try self.beginTranslation()
            }

            let targetLangCode = params["targetLangCode"] as? String ?? "en"
            guard let sourceLangCode = params["sourceLangCode"] as? String, !sourceLangCode.isEmpty else {
                await MainActor.run {
                    self.finishTranslation()
                }
                throw InvalidSourceLanguageException()
            }
            let preferredStrategy = params["preferredStrategy"] as? String

            let props = await MainActor.run {
                let p = PrepareProps()
                p.targetLanguage = targetLangCode
                p.sourceLanguage = sourceLangCode
                p.preferredStrategy = preferredStrategy
                return p
            }

            if #available(iOS 18.0, *) {
                return try await withCheckedThrowingContinuation { continuation in
                    Task { @MainActor in
                        var didSettle = false

                        let reject: (String) -> Void = { errorMessage in
                            guard !didSettle else { return }
                            didSettle = true
                            self.finishTranslation()
                            continuation.resume(throwing: NSError(
                                domain: "ExpoIosTranslateModule",
                                code: 3,
                                userInfo: [NSLocalizedDescriptionKey: errorMessage]
                            ))
                            self.dismissTranslationView()
                        }

                        props.onSuccess = {
                            guard !didSettle else { return }
                            didSettle = true
                            self.finishTranslation()
                            continuation.resume(returning: ["prepared": true, "cancelled": false])
                            self.dismissTranslationView()
                        }

                        props.onError = { errorMessage in
                            reject(errorMessage)
                        }

                        props.onCancel = {
                            guard !didSettle else { return }
                            didSettle = true
                            self.finishTranslation()
                            continuation.resume(returning: ["prepared": false, "cancelled": true])
                            self.dismissTranslationView()
                        }

                        if !self.presentPrepareTranslationView(props) {
                            reject("Unable to present translation preparation view.")
                        }
                    }
                }
            } else {
                await MainActor.run {
                    self.finishTranslation()
                }
                throw UnsupportedOSVersionException("18.0")
            }
        }
    }

    // MARK: - Private Helpers for Managing SwiftUI Views
    @MainActor
    private func beginTranslation() throws {
        guard !isTranslating else { throw TranslationInProgressException() }
        isTranslating = true
    }

    @MainActor
    private func finishTranslation() {
        isTranslating = false
    }

    @MainActor
    private func presentTranslationView(_ props: Props) -> Bool {
        let controller = UIHostingController(rootView: AnyView(IOSTranslateTasks(props: props)))
        hostingController = controller

        if let rootVC = activeRootViewController() {
            rootVC.addChild(controller)
            rootVC.view.addSubview(controller.view)
            controller.view.frame = CGRect(x: 0, y: 0, width: 1, height: 1)
            controller.view.isHidden = true
            controller.didMove(toParent: rootVC)
            return true
        }

        hostingController = nil
        return false
    }

    @MainActor
    private func presentTranslationSheet(_ props: SheetProps) -> Bool {
        let controller = UIHostingController(rootView: AnyView(IOSTranslateSheet(props: props)))
        hostingController = controller

        if let rootVC = activeRootViewController() {
            rootVC.addChild(controller)
            rootVC.view.addSubview(controller.view)
            controller.view.frame = CGRect(x: 0, y: 0, width: 1, height: 1)
            controller.view.isHidden = true
            controller.didMove(toParent: rootVC)
            return true
        }

        hostingController = nil
        return false
    }

    @MainActor
    private func presentPrepareTranslationView(_ props: PrepareProps) -> Bool {
        let controller = UIHostingController(rootView: AnyView(IOSPrepareTranslation(props: props)))
        hostingController = controller

        if let rootVC = activeRootViewController() {
            rootVC.addChild(controller)
            rootVC.view.addSubview(controller.view)
            controller.view.frame = CGRect(x: 0, y: 0, width: 1, height: 1)
            controller.view.isHidden = true
            controller.didMove(toParent: rootVC)
            return true
        }

        hostingController = nil
        return false
    }

    @MainActor
    private func dismissTranslationView() {
        if let controller = hostingController {
            controller.view.removeFromSuperview()
            controller.removeFromParent()
            hostingController = nil
        }
    }

    @MainActor
    private func activeRootViewController() -> UIViewController? {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let scene = scenes.first { $0.activationState == .foregroundActive }
            ?? scenes.first { $0.activationState == .foregroundInactive }
            ?? scenes.first
        let window = scene?.windows.first { $0.isKeyWindow }
            ?? scene?.windows.first { !$0.isHidden }

        var rootVC = window?.rootViewController
        while let presentedVC = rootVC?.presentedViewController {
            rootVC = presentedVC
        }
        return rootVC
    }
}
