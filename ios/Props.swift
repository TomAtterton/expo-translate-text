import SwiftUI

@MainActor
public class Props: ObservableObject {
  @Published var texts: [String] = []
  @Published var onSuccess: (([String], String?) -> Void)?
  @Published var onError: ((String) -> Void)?
  @Published var onCancel: (() -> Void)?
  @Published var sourceLanguage: String?
  @Published var targetLanguage: String?
  @Published var preferredStrategy: String?
}

@MainActor
public class PrepareProps: ObservableObject {
  @Published var onSuccess: (() -> Void)?
  @Published var onError: ((String) -> Void)?
  @Published var onCancel: (() -> Void)?
  @Published var sourceLanguage: String?
  @Published var targetLanguage: String?
  @Published var preferredStrategy: String?
}

@MainActor
public class SheetProps: ObservableObject {
  @Published var text: String = ""
  @Published var isPresented: Bool = false
  @Published var didTranslate: Bool = false
  @Published var onHide: () -> Void = {}
}
