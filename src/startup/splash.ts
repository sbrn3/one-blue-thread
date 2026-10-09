// The native splash (linen plus the mark; app.json → expo-splash-screen) stays
// up until the launch weave paints its first frame. A cold start then goes
// splash → weave → reading with no blank screen between them
// (docs/plans/reading-screen-and-motion, F1).
//
// Whichever comes first releases it: the weave's first frame, onboarding, an
// error screen, or the safety timeout. That way the splash can never get stuck
// over a screen that would otherwise be usable.
import * as SplashScreen from 'expo-splash-screen';

const SAFETY_MS = 10_000;
let released = false;

export function holdSplash(): void {
  SplashScreen.preventAutoHideAsync().catch(() => undefined);
  setTimeout(releaseSplash, SAFETY_MS);
}

export function releaseSplash(): void {
  if (released) return;
  released = true;
  SplashScreen.hideAsync().catch(() => undefined);
}
