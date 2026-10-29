import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppView, SessionConfig, SessionRecord } from './types';
import { AppShell } from './components/AppShell';
import { HomeScreen } from './screens/HomeScreen';
import { SetupScreen } from './screens/SetupScreen';
import { StatsScreen } from './screens/StatsScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { calculateStats } from './lib/stats';
import { loadConfig, loadSessions, saveConfig, saveSessions } from './lib/storage';
import { primeAudio } from './lib/sound';
import { warmUpSpeech } from './lib/speech';
import { hideSplashScreen, isNativeApp, prepareNativeUi } from './lib/native';

function App() {
  const [sessions, setSessions] = useState<SessionRecord[]>(() => loadSessions());
  const [config, setConfig] = useState<SessionConfig>(() => loadConfig());
  const [view, setView] = useState<AppView>('home');
  const [summary, setSummary] = useState<SessionRecord | null>(null);
  const stats = useMemo(() => calculateStats(sessions), [sessions]);
  const viewRef = useRef<AppView>(view);
  viewRef.current = view;

  useEffect(() => {
    saveConfig(config);
  }, [config]);

  useEffect(() => {
    void prepareNativeUi();
    void hideSplashScreen();
  }, []);

  useEffect(() => {
    if (!isNativeApp) return;
    let disposed = false;
    let removeListener: (() => Promise<void>) | null = null;

    void import('@capacitor/app').then(({ App: NativeApp }) => {
      if (disposed) return;
      void NativeApp.addListener('backButton', () => {
        const current = viewRef.current;
        if (current === 'workout') return;
        if (current === 'home') {
          void NativeApp.exitApp();
          return;
        }
        setView('home');
      }).then((listener) => {
        removeListener = () => listener.remove();
        if (disposed) void removeListener();
      });
    });

    return () => {
      disposed = true;
      if (removeListener) void removeListener();
    };
  }, []);

  useEffect(() => {
    if (view !== 'workout') window.scrollTo(0, 0);
  }, [view]);

  const navigate = (nextView: 'home' | 'setup' | 'stats') => {
    setView(nextView);
  };

  const startWorkout = () => {
    primeAudio();
    warmUpSpeech();
    setView('workout');
  };

  const handleFinish = (record: SessionRecord) => {
    setSessions((previous) => {
      if (previous.some((session) => session.id === record.id)) return previous;
      const next = [record, ...previous].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      );
      saveSessions(next);
      return next;
    });
    setSummary(record);
    setView('summary');
  };

  if (view === 'workout') {
    return <WorkoutScreen config={config} onFinish={handleFinish} />;
  }

  return (
    <AppShell view={view} stats={stats} onNavigate={navigate}>
      {view === 'home' && (
        <HomeScreen
          sessions={sessions}
          stats={stats}
          config={config}
          onStart={() => navigate('setup')}
          onViewStats={() => navigate('stats')}
        />
      )}
      {view === 'setup' && (
        <SetupScreen config={config} onChange={setConfig} onStart={startWorkout} />
      )}
      {view === 'stats' && (
        <StatsScreen sessions={sessions} stats={stats} onStart={() => navigate('setup')} />
      )}
      {view === 'summary' && summary && (
        <SummaryScreen
          record={summary}
          onHome={() => navigate('home')}
          onAgain={() => navigate('setup')}
          onStats={() => navigate('stats')}
        />
      )}
      {view === 'summary' && !summary && (
        <HomeScreen
          sessions={sessions}
          stats={stats}
          config={config}
          onStart={() => navigate('setup')}
          onViewStats={() => navigate('stats')}
        />
      )}
    </AppShell>
  );
}

export default App;
