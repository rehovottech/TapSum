import UIKit
import Capacitor
import AVFoundation

/// The current iOS SDK requires the UIScene life cycle. The window and the Capacitor bridge view
/// controller still come from Main.storyboard (named in Info.plist > UIApplicationSceneManifest);
/// this class forwards URL opens and Universal Links to Capacitor, which the AppDelegate hooks
/// no longer receive under scenes.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard scene is UIWindowScene else { return }

        // Keep AppDelegate.window pointing at the real window for any code that still reads it
        (UIApplication.shared.delegate as? AppDelegate)?.window = window

        // App launched cold from a URL or a Universal Link
        if !connectionOptions.urlContexts.isEmpty {
            self.scene(scene, openURLContexts: connectionOptions.urlContexts)
        }
        for activity in connectionOptions.userActivities {
            self.scene(scene, continue: activity)
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts {
            var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
            if let source = context.options.sourceApplication {
                options[.sourceApplication] = source
            }
            options[.openInPlace] = context.options.openInPlace
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: options)
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}

/// Native SFX + music for the iOS app. After an ad SDK runs, WebKit's Web Audio stays frozen for the rest of the
/// run (nothing revives it), while native players keep working. JS calls reactivate() after every ad.
@objc(AudioSessionPlugin)
public class AudioSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AudioSessionPlugin"
    public let jsName = "AudioSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "reactivate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "load", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playMusic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setMusicVolume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pauseMusic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resumeMusic", returnType: CAPPluginReturnPromise)
    ]

    override public func load() {
        activate()
        NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] note in
            guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  AVAudioSession.InterruptionType(rawValue: raw) == .ended else { return }
            self?.activate()
        }
    }

    @discardableResult
    private func activate() -> Bool {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.ambient, mode: .default, options: [])
            try session.setActive(true)
            return true
        } catch {
            return false
        }
    }

    // MARK: native playback
    // After an ad SDK runs, WebKit's Web Audio stays frozen for the rest of the run while native players keep
    // working, so on iOS all SFX and music play here instead of through Howler.

    private var pools: [String: [AVAudioPlayer]] = [:]
    private var music: AVAudioPlayer?
    private var musicTrack = ""

    private func audioURL(_ name: String) -> URL? {
        Bundle.main.url(forResource: name, withExtension: "mp3", subdirectory: "public/assets/audio")
    }

    @objc func load(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            var missing: [String] = []
            for key in call.getArray("keys", String.self) ?? [] where self.pools[key] == nil {
                guard let url = self.audioURL(key) else { missing.append(key); continue }
                self.pools[key] = (0..<5).compactMap { _ in
                    guard let p = try? AVAudioPlayer(contentsOf: url) else { return nil }
                    p.enableRate = true
                    p.prepareToPlay()
                    return p
                }
            }
            call.resolve(["loaded": self.pools.count, "missing": missing])
        }
    }

    @objc func play(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let key = call.getString("key"), let pool = self.pools[key], !pool.isEmpty else { call.resolve(["played": false]); return }
            let p = pool.first(where: { !$0.isPlaying }) ?? pool[0]
            p.currentTime = 0
            p.rate = Float(call.getDouble("rate") ?? 1)
            p.volume = Float(call.getDouble("volume") ?? 0.9)
            call.resolve(["played": p.play()])
        }
    }

    @objc func playMusic(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let track = call.getString("track") ?? "music"
            let volume = Float(call.getDouble("volume") ?? 0.16)
            let fade = call.getDouble("fade") ?? 0.6
            if track == self.musicTrack, let m = self.music {
                if !m.isPlaying { m.play() }
                m.setVolume(volume, fadeDuration: fade)
                call.resolve(["playing": m.isPlaying]); return
            }
            if let old = self.music {
                old.setVolume(0, fadeDuration: fade / 2)
                DispatchQueue.main.asyncAfter(deadline: .now() + fade / 2 + 0.05) { old.stop() }
            }
            guard let url = self.audioURL(track), let p = try? AVAudioPlayer(contentsOf: url) else {
                self.music = nil; self.musicTrack = ""
                call.resolve(["playing": false, "error": "cannot load \(track)"]); return
            }
            p.numberOfLoops = -1
            p.volume = 0
            p.prepareToPlay()
            let ok = p.play()
            p.setVolume(volume, fadeDuration: fade)
            self.music = p
            self.musicTrack = track
            call.resolve(["playing": ok])
        }
    }

    @objc func setMusicVolume(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.music?.setVolume(Float(call.getDouble("volume") ?? 0.16), fadeDuration: call.getDouble("fade") ?? 0)
            call.resolve()
        }
    }

    @objc func pauseMusic(_ call: CAPPluginCall) {
        DispatchQueue.main.async { self.music?.pause(); call.resolve() }
    }

    @objc func resumeMusic(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.activate()
            call.resolve(["playing": self.music?.play() ?? false])
        }
    }

    /// Re-activate the session after an ad, and bring the music back if it was playing.
    @objc func reactivate(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(["active": self.activate()]) }
    }
}

class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AudioSessionPlugin())
    }
}
