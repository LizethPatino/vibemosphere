import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
  type TransitionEvent,
} from 'react';

const PHRASES_EARLY = [
'Finding what lives here…',
'Letting this take shape…',
'Listening to what it carries…',
'Seeing what emerges…'
] as const;

const PHRASES_LATE = [
'One more moment…',
'Almost there…',
'Just a little longer…'
] as const;

const LONG_LOAD_MS = 8000;
const INTERVAL_EARLY_MS = 2500;
const INTERVAL_LATE_MS = 3200;
const FADE_EARLY_MS = 680;
const FADE_LATE_MS = 820;

const LoadingOverlay: FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  return (
    <>
      <span className="interpret-layer interpret-layer--veil" aria-hidden />
      <span className="interpret-layer interpret-layer--sweep" aria-hidden />
    </>
  );
};

const LoadingRoot: FC = () => {
  const [phase, setPhase] = useState<'early' | 'late'>('early');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [secondaryOpacity, setSecondaryOpacity] = useState(1);
  const pendingAdvance = useRef(false);
  const secondaryOpacityRef = useRef(1);
  const startedAtRef = useRef(Date.now());

  const fadeMs = phase === 'late' ? FADE_LATE_MS : FADE_EARLY_MS;
  const phrase = phase === 'early' ? PHRASES_EARLY[phraseIndex] : PHRASES_LATE[phraseIndex];

  useEffect(() => {
    secondaryOpacityRef.current = secondaryOpacity;
  }, [secondaryOpacity]);

  const scheduleAdvance = useCallback(() => {
    pendingAdvance.current = true;
    setSecondaryOpacity(0);
  }, []);

  useEffect(() => {
    const intervalMs = phase === 'late' ? INTERVAL_LATE_MS : INTERVAL_EARLY_MS;
    const id = window.setInterval(scheduleAdvance, intervalMs);
    return () => window.clearInterval(id);
  }, [phase, scheduleAdvance]);

  const handleSecondaryTransitionEnd = (e: TransitionEvent<HTMLParagraphElement>) => {
    if (e.propertyName !== 'opacity') return;
    if (!pendingAdvance.current || secondaryOpacityRef.current !== 0) return;

    pendingAdvance.current = false;

    const elapsed = Date.now() - startedAtRef.current;
    const shouldShiftLate = phase === 'early' && elapsed >= LONG_LOAD_MS;

    if (shouldShiftLate) {
      setPhase('late');
      setPhraseIndex(0);
    } else if (phase === 'early') {
      setPhraseIndex((i) => (i + 1) % PHRASES_EARLY.length);
    } else {
      setPhraseIndex((i) => (i + 1) % PHRASES_LATE.length);
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSecondaryOpacity(1));
    });
  };

  return (
    <div className="interpret-caption" role="status" aria-live="polite">
      <p
        className="interpret-caption__phrase"
        style={{ opacity: secondaryOpacity, transition: `opacity ${fadeMs}ms ease-in-out` }}
        onTransitionEnd={handleSecondaryTransitionEnd}
      >
        {phrase}
      </p>
    </div>
  );
};

const Loading = Object.assign(LoadingRoot, { Overlay: LoadingOverlay }) as typeof LoadingRoot & {
  Overlay: typeof LoadingOverlay;
};

export default Loading;
