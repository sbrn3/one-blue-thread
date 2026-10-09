import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { installGlobalErrorHandler, logError, registerErrorDb } from './src/errors';
import { ErrorBoundary } from './src/errors/ErrorBoundary';
import { Flow } from './src/flow/Flow';
import { Knot } from './src/knot';
import { maybeGenerateReports } from './src/lab/analysis/report';
import { reconcile } from './src/lab/reconcile';
import { RECONCILE_STEPS } from './src/lab/steps';
import { BUILD_SHA } from './src/log/buildSha';
import { meta } from './src/log/log';
import { OnboardingFlow } from './src/onboarding';
import { createServices, openDb } from './src/services';
import { mark } from './src/startup/timing';
import { tokens } from './src/ui/tokens';

// Once, at module load — before any db exists, so it's armed for
// whatever happens during openDb() itself.
installGlobalErrorHandler();
mark('modulesLoaded');

export default function App() {
  // Bundled, so this resolves in milliseconds — but it is deliberately NOT a
  // render gate. Blocking the tree on an async load is how the launch screen
  // froze once already; a few frames in the system fallback is the cheaper
  // failure. tokens.font.* names must match these keys exactly.
  useFonts({
    'Schibsted Grotesk': require('./assets/fonts/SchibstedGrotesk.ttf'),
    Newsreader: require('./assets/fonts/Newsreader.ttf'),
    'JetBrains Mono': require('./assets/fonts/JetBrainsMono.ttf'),
  });

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: tokens.color.paper }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {/* Mounted outside AppRuntime so it also catches openDb()/createServices()
            throwing synchronously during AppRuntime's own render, not just
            failures deeper in the tree (docs/plans/app-quality-foundations). */}
        <ErrorBoundary>
          <AppRuntime />
        </ErrorBoundary>
      </SafeAreaProvider>
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}

function AppRuntime() {
  const db = useMemo(() => {
    mark('openDb');
    const opened = openDb();
    mark('dbOpen');
    return opened;
  }, []);
  useEffect(() => registerErrorDb(db), [db]);

  const [onboarded, setOnboarded] = useState(() => meta.get(db, 'onboarded') === '1');
  // Rebuilt whenever onboarding completes (so the text provider picks up what
  // onboarding just wrote to meta) and whenever the knot switches translation.
  // Flow's session-load effect keys on `text`'s identity, so a new services
  // object is enough to reload today's portion in the new translation.
  const [serviceEpoch, setServiceEpoch] = useState(0);
  const services = useMemo(() => {
    const created = createServices(db);
    mark('servicesReady');
    return created;
  }, [db, onboarded, serviceEpoch]);
  const handleTranslationChanged = useCallback(() => setServiceEpoch((e) => e + 1), []);

  // The boot effect below must fire once per real launch / onboarding-complete
  // transition — never on a translation switch, which also yields a new
  // `services`. Reading it through a ref keeps the effect off `services`, so a
  // switch does not re-run reconcile() or write a spurious app_open row to the
  // append-only event log.
  const servicesRef = useRef(services);
  useEffect(() => {
    servicesRef.current = services;
  }, [services]);

  useEffect(() => {
    if (!onboarded) return;
    const services = servicesRef.current;
    // §13.4 — everything the app "does at 4 AM" happens here instead,
    // lazily, on foreground. Runs before app_open is logged so the
    // reconciled state reflects days up to (not including) today.
    mark('bootWork');
    reconcile({ db, log: services.log }, RECONCILE_STEPS);
    maybeGenerateReports(db);
    // fix/marked-list — drop repeated marks (the July re-tap bug) and marks of
    // passages already being learned. Idempotent; cheap on every launch.
    services.memory.tidyMarks();

    // §19 — marks deploy boundaries on the phase chart / amendment log.
    // Never fires on the very first-ever open (nothing to compare against).
    const lastSeenBuild = meta.get(db, 'last_seen_build_sha');
    if (lastSeenBuild !== null && lastSeenBuild !== BUILD_SHA) {
      services.log.write({ type: 'build_changed' });
    }
    meta.set(db, 'last_seen_build_sha', BUILD_SHA);

    services.log.write({ type: 'app_open' });
    mark('bootWorkDone');

    // §19 "Weekly (auto): encrypted export. Silent unless it fails" —
    // fire-and-forget, never blocks app open.
    void services.backup.snapshotIfDue().catch((e: unknown) => {
      logError(db, `weekly recovery snapshot failed: ${e instanceof Error ? e.message : String(e)}`);
    });
  }, [onboarded, db]); // NOT `services` — see servicesRef above

  return onboarded ? (
    <>
      <Flow services={services} />
      <Knot services={services} onTranslationChanged={handleTranslationChanged} />
    </>
  ) : (
    <OnboardingFlow services={services} onDone={() => setOnboarded(true)} />
  );
}
