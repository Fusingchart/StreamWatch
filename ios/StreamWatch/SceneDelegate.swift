import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    // React Native / Expo manages the UIWindow in AppDelegate.
    // This class exists solely to satisfy iOS 27's UIScene lifecycle requirement.
  }
}
