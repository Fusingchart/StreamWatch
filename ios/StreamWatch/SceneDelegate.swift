import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let appWindow = appDelegate.window else { return }
    // Attach the window Expo/React Native created in AppDelegate to this scene.
    appWindow.windowScene = windowScene
    appWindow.makeKeyAndVisible()
  }
}
