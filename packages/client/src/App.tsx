import { lazy, Suspense, useState, type ChangeEvent } from 'react';
import type { MoodResponse } from '@vibemosphere/shared';
import musicTexture from './assets/music-texture.png';
import nightTexture from './assets/night-texture.png';
import { validateIllustrationExif } from './illustrationExif';
import { UploadScreen } from './screens/UploadScreen';
import { ResultScreen } from './screens/ResultScreen';
import { FeedbackScreen } from './screens/FeedbackScreen';
import { JournalScreen } from './screens/JournalScreen';
const VibeMapScreen = lazy(() =>
  import('./screens/VibeMapScreen').then((m) => ({ default: m.VibeMapScreen }))
);

const ANALYZE_ENDPOINT = 'http://localhost:3001/api/analyze';
const TRANSIENT_RETRY_DELAYS_MS = [1000, 3000] as const;
const TRANSIENT_ERROR_MESSAGE =
  "Couldn't read this one right now. Sometimes the mirror clouds over. Want to try again?";
const SERVICE_UNAVAILABLE_MESSAGE =
  "The mirror is resting right now. This isn't your drawing — it's us. Try again in a few minutes.";
const RATE_LIMIT_MESSAGE = 'A lot of vibes coming through right now. Try in a moment.';
const OFFLINE_MESSAGE = "You're offline. Reconnect and try again.";

const EMPTY_RESULT: MoodResponse = {
  stamp: {
    title: '',
    moodTags: [],
    music: '',
    description: '',
  },
  reflection: {
    quote: {
      text: '',
      author: '',
      source: '',
    },
  },
};

type AnalyzeErrorKind = 'transient' | 'serviceUnavailable' | 'rateLimit' | 'offline';

type AnalyzeErrorState = {
  kind: AnalyzeErrorKind;
  message: string;
};

type AnalyzeRequestFailureKind =
  | AnalyzeErrorKind
  | 'malformedResponse';

type AnalyzeRequestFailure = {
  kind: AnalyzeRequestFailureKind;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function toAnalyzeErrorState(kind: AnalyzeErrorKind): AnalyzeErrorState {
  switch (kind) {
    case 'serviceUnavailable':
      return { kind, message: SERVICE_UNAVAILABLE_MESSAGE };
    case 'rateLimit':
      return { kind, message: RATE_LIMIT_MESSAGE };
    case 'offline':
      return { kind, message: OFFLINE_MESSAGE };
    default:
      return { kind: 'transient', message: TRANSIENT_ERROR_MESSAGE };
  }
}

function isAnalyzeRequestFailure(error: unknown): error is AnalyzeRequestFailure {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'kind' in error &&
      typeof (error as { kind?: unknown }).kind === 'string'
  );
}

async function requestAnalyze(image: string): Promise<MoodResponse> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(ANALYZE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
      signal: controller.signal,
    });

    const raw = await response.text();
    let payload: unknown = null;

    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        throw { kind: 'malformedResponse' } satisfies AnalyzeRequestFailure;
      }
    }

    if (!response.ok) {
      const code =
        payload && typeof payload === 'object' && 'code' in payload
          ? (payload as { code?: unknown }).code
          : null;

      if (code === 'MALFORMED_AI_RESPONSE') {
        throw { kind: 'malformedResponse' } satisfies AnalyzeRequestFailure;
      }

      if (response.status === 429) {
        throw { kind: 'rateLimit' } satisfies AnalyzeRequestFailure;
      }

      if (response.status === 503 || response.status === 529) {
        throw { kind: 'serviceUnavailable' } satisfies AnalyzeRequestFailure;
      }

      throw { kind: 'transient' } satisfies AnalyzeRequestFailure;
    }

    if (!payload || typeof payload !== 'object') {
      throw { kind: 'malformedResponse' } satisfies AnalyzeRequestFailure;
    }

    return payload as MoodResponse;
  } catch (error) {
    if (isAnalyzeRequestFailure(error)) {
      throw error;
    }

    if (isOffline()) {
      throw { kind: 'offline' } satisfies AnalyzeRequestFailure;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw { kind: 'transient' } satisfies AnalyzeRequestFailure;
    }

    if (error instanceof TypeError) {
      throw { kind: 'transient' } satisfies AnalyzeRequestFailure;
    }

    throw { kind: 'transient' } satisfies AnalyzeRequestFailure;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function formatJournalDate(now: Date) {
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = String(now.getFullYear());
  const iso = `${yyyy}-${mm}-${dd}`;
  const dmy = `${dd}/${mm}/${yyyy}`;
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(now);
  return { iso, dmy, weekday };
}

function getSessionId(): string {
  let sessionId = localStorage.getItem('vibe_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('vibe_session_id', sessionId);
  }
  return sessionId;
}

function App() {
  const [screen, setScreen] = useState<'upload' | 'result' | 'feedback' | 'journal' | 'vibemap'>('upload');
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<MoodResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refinementInput, setRefinementInput] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<AnalyzeErrorState | null>(null);
  const [manualOnly, setManualOnly] = useState(false);

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = e.target.files?.[0];
    if (!file) return;

    const exifError = await validateIllustrationExif(file);
    if (exifError) {
      setImage(null);
      setResult(null);
      setScreen('upload');
      setUploadError(exifError);
      setAnalyzeError(null);
      setManualOnly(false);
      input.value = '';
      return;
    }

    setUploadError(null);
    setAnalyzeError(null);
    setManualOnly(false);

    const reader = new FileReader();

    reader.onloadend = () => {
      setImage(reader.result as string);
      setResult(null);
      setScreen('upload');
    };

    reader.onerror = () => {
      setImage(null);
      setResult(null);
      setScreen('upload');
      setUploadError(
        "This file didn't quite arrive as a readable illustration. Try exporting it once more, and we'll look again."
      );
      setAnalyzeError(null);
      setManualOnly(false);
      input.value = '';
    };

    reader.readAsDataURL(file);
  };

  const analyzeVibe = async () => {
    if (!image) return;

    if (isOffline()) {
      setAnalyzeError(toAnalyzeErrorState('offline'));
      return;
    }

    setLoading(true);
    setAnalyzeError(null);
    setUploadError(null);
    try {
      let transientFailures = 0;
      let malformedFailures = 0;

      while (true) {
        try {
          const data = await requestAnalyze(image);
          setResult(data);
          setManualOnly(false);
          setScreen('result');
          return;
        } catch (error) {
          if (!isAnalyzeRequestFailure(error)) {
            setAnalyzeError(toAnalyzeErrorState('transient'));
            return;
          }

          if (error.kind === 'offline') {
            setAnalyzeError(toAnalyzeErrorState('offline'));
            return;
          }

          if (error.kind === 'rateLimit') {
            setAnalyzeError(toAnalyzeErrorState('rateLimit'));
            return;
          }

          if (error.kind === 'serviceUnavailable') {
            setAnalyzeError(toAnalyzeErrorState('serviceUnavailable'));
            return;
          }

          if (error.kind === 'malformedResponse') {
            if (malformedFailures < 1) {
              malformedFailures += 1;
              continue;
            }

            setAnalyzeError(toAnalyzeErrorState('transient'));
            return;
          }

          if (transientFailures < TRANSIENT_RETRY_DELAYS_MS.length) {
            const delay = TRANSIENT_RETRY_DELAYS_MS[transientFailures];
            transientFailures += 1;
            await sleep(delay);
            continue;
          }

          setAnalyzeError(toAnalyzeErrorState('transient'));
          return;
        }
      }
    } catch (error) {
      console.error("Connection error:", error);
      setAnalyzeError(toAnalyzeErrorState('transient'));
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = async (
    feedbackType: 'yes' | 'refined' | 'own',
    note: string,
    ownTitle: string,
    refineInput: string
  ): Promise<void> => {
    if (!image || !result) return;
    const sessionId = getSessionId();
    try {
      await fetch('http://localhost:3001/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          image,
          vibeData: result,
          feedback: {
            type: feedbackType,
            note,
            ownTitle,
            refineInput: refineInput || refinementInput,
          },
        }),
      });
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleGoToFeedback = () => {
    setManualOnly(false);
    setAnalyzeError(null);
    setScreen('feedback');
  };

  const handleDescribeItMyself = () => {
    if (!image) return;
    setAnalyzeError(null);
    setManualOnly(true);
    setResult(EMPTY_RESULT);
    setScreen('feedback');
  };

  const handleRefined = (newResult: MoodResponse, input: string) => {
    setResult(newResult);
    setRefinementInput(input);
    setManualOnly(false);
    setScreen('result');
  };

  const handleRestart = () => {
    setScreen('upload');
    setImage(null);
    setResult(null);
    setRefinementInput('');
    setUploadError(null);
    setAnalyzeError(null);
    setManualOnly(false);
  };

  const { iso, dmy, weekday } = formatJournalDate(new Date());

  if (screen === 'result' && image && result) {
    return (
      <ResultScreen
        iso={iso}
        dmy={dmy}
        weekday={weekday}
        nightTexture={nightTexture}
        musicTexture={musicTexture}
        image={image}
        result={result}
        onGoToFeedback={handleGoToFeedback}
        onGoToJournal={() => setScreen('journal')}
      />
    );
  }

  if (screen === 'feedback' && image && result) {
    return (
      <FeedbackScreen
        iso={iso}
        dmy={dmy}
        weekday={weekday}
        nightTexture={nightTexture}
        musicTexture={musicTexture}
        image={image}
        result={result}
        onRestart={handleRestart}
        onSave={saveEntry}
        onRefined={handleRefined}
        refinementInput={refinementInput}
        manualOnly={manualOnly}
        onGoToJournal={() => setScreen('journal')}
      />
    );
  }

  if (screen === 'journal') {
    return (
      <JournalScreen
        nightTexture={nightTexture}
        musicTexture={musicTexture}
        onBack={() => setScreen('upload')}
        onVibeMap={() => setScreen('vibemap')}
      />
    );
  }

  if (screen === 'vibemap') {
    return (
      <Suspense fallback={null}>
        <VibeMapScreen
          nightTexture={nightTexture}
          musicTexture={musicTexture}
          onBack={() => setScreen('journal')}
        />
      </Suspense>
    );
  }

  return (
    <UploadScreen
      iso={iso}
      dmy={dmy}
      weekday={weekday}
      nightTexture={nightTexture}
      musicTexture={musicTexture}
      image={image}
      loading={loading}
      uploadError={uploadError}
      analyzeError={analyzeError}
      onImageChange={handleImageChange}
      onAnalyze={analyzeVibe}
      onDescribeItMyself={handleDescribeItMyself}
      onGoToJournal={() => setScreen('journal')}
    />
  );
}

export default App