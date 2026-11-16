Paste this into Claude Code, opened in this folder.

---

Read CLAUDE.md, docs/decisions.md and verifier/README.md first. This is NOT a rebuild: index.html is a working, playtested prototype (v15). Keep it working and keep its behavior identical unless I ask for a change. Refactors must be verified against the original (same verifier results, same golden replays). The prototype is fun; protect the feel. After any physics or stage change, run the verifier for both levels and report deltas against the README.

Tasks, in order. Stop after each and show me results before starting the next:

1. Repo setup: git init, .gitignore, first commit, push to a new private GitHub repo (I'm on Windows; use commands that work in Git Bash). index.html must keep working as-is in a browser.
2. Physics module: move the code between `// ==PHYSICS START==` and `// ==PHYSICS END==` into a pure module (inputs in, state out, no DOM or rendering). Page and verifier both use it. Add a golden-replay test: record per-tick inputs for 3 runs per level, assert identical final state and time.
3. Input commands: swipe, keyboard (and later tilt) all reduce to one per-tick command {yawDelta, strafe, fingerDown}. Physics and replays consume only commands.
4. Determinism check: Node (V8) and iPhone Safari (JavaScriptCore) may differ in the last bits of Math.sin/cos/atan2/hypot. Run a golden replay in both and compare. If they diverge, replace those calls in physics with our own implementations. Report what you found.
5. Phone test without a Mac (I'm on Windows; iOS native builds need macOS + Xcode, for Capacitor, Godot and Unity alike): host the game on GitHub Pages (HTTPS) and play it in iPhone Safari, which uses the same WebKit engine Capacitor would wrap. Measure frame rate (does it hold 120 fps on ProMotion?), touch-to-screen feel, and battery/heat over 15 min. Then recommend how to do the native build: cloud Mac build service (e.g. Codemagic or GitHub Actions macOS runners, to TestFlight) vs buying a used Mac mini. Confirm current options and prices before recommending.
6. Tilt mode (settings toggle): tilt sets turn rate with a dead zone; tilt direction sets air strafe (dead zone = fly straight). A "Tare" button saves the current orientation as neutral using a relative rotation, so playing lying on your side works. Test it in iPhone Safari on the GitHub Pages build (motion needs HTTPS and a permission tap on iOS). Native motion via Capacitor later if needed.

Before step 1, ask me any questions you need answered.
