import SwiftUI
#if canImport(Translation)
import Translation
#endif

// MARK: - SwiftUI Views for Translation Task (Task Mode)

struct IOSTranslateTasks: View {
  @ObservedObject var props: Props

  var body: some View {
    if #available(iOS 18.0, *) {
      IOSTranslateTasksAvailable(props: props)
    } else {
      IOSTranslateTasksUnavailable(props: props)
    }
  }
}

@available(iOS 18.0, *)
struct IOSTranslateTasksAvailable: View {
  @ObservedObject var props: Props
  @State private var configuration: TranslationSession.Configuration?
  @State private var didComplete = false

  var body: some View {
    Color.clear
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .translationTask(configuration) { session in
        await translateSequence(session)
      }
      .onAppear {
        configuration = makeConfiguration(from: props)
      }
      .onDisappear {
        if !didComplete {
          props.onCancel?()
        }
      }
  }

  private func translateSequence(_ session: TranslationSession) async {
    let requests: [TranslationSession.Request] = props.texts.enumerated().map { (index, text) in
      .init(sourceText: text, clientIdentifier: "\(index)")
    }
    do {
      var translatedTexts = Array(repeating: "", count: props.texts.count)
      var detectedSourceLanguage: String? = nil

      for try await response in session.translate(batch: requests) {
        if let index = Int(response.clientIdentifier ?? "") {
          translatedTexts[index] = response.targetText
        }
        if detectedSourceLanguage == nil {
          detectedSourceLanguage = response.sourceLanguage.languageCode?.identifier
        }
      }
      await MainActor.run {
        didComplete = true
        props.onSuccess?(translatedTexts, detectedSourceLanguage)
      }
    } catch {
      await MainActor.run {
        didComplete = true
        props.onError?(error.localizedDescription)
      }
    }
  }
}

struct IOSTranslateTasksUnavailable: View {
  @ObservedObject var props: Props

  var body: some View {
    Color.clear
      .onAppear {
        props.onError?("Translation is only supported on iOS 18.0 or newer")
      }
  }
}

// MARK: - SwiftUI View for Preparing Translation

struct IOSPrepareTranslation: View {
  @ObservedObject var props: PrepareProps

  var body: some View {
    if #available(iOS 18.0, *) {
      IOSPrepareTranslationAvailable(props: props)
    } else {
      IOSPrepareTranslationUnavailable(props: props)
    }
  }
}

@available(iOS 18.0, *)
struct IOSPrepareTranslationAvailable: View {
  @ObservedObject var props: PrepareProps
  @State private var configuration: TranslationSession.Configuration?
  @State private var didComplete = false

  var body: some View {
    Color.clear
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .translationTask(configuration) { session in
        await prepare(session)
      }
      .onAppear {
        configuration = makeConfiguration(from: props)
      }
      .onDisappear {
        if !didComplete {
          props.onCancel?()
        }
      }
  }

  private func prepare(_ session: TranslationSession) async {
    do {
      try await session.prepareTranslation()
      await MainActor.run {
        didComplete = true
        props.onSuccess?()
      }
    } catch {
      await MainActor.run {
        didComplete = true
        props.onError?(error.localizedDescription)
      }
    }
  }
}

struct IOSPrepareTranslationUnavailable: View {
  @ObservedObject var props: PrepareProps

  var body: some View {
    Color.clear
      .onAppear {
        props.onError?("Preparing translation is only supported on iOS 18.0 or newer")
      }
  }
}

// MARK: - SwiftUI View for Translation Sheet (Sheet Mode)

struct IOSTranslateSheet: View {
  @ObservedObject var props: SheetProps

  var body: some View {
    if #available(iOS 17.4, *) {
      Color.clear
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .translationPresentation(isPresented: $props.isPresented, text: props.text) { translatedText in
          props.text = translatedText
          props.didTranslate = true
        }
        .onChange(of: props.isPresented) { oldValue, newValue in
          if oldValue == true && newValue == false {
            props.onHide()
          }
        }
    } else {
      EmptyView()
    }
  }
}
