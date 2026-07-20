import { useEffect, useState } from 'react';
import type { MoodResponse } from '@vibemosphere/shared';
import Loading from '../components/Loading';
import { JournalFooter } from '../components/JournalFooter';

const REFINE_PHRASES_EARLY = [
  'Looking again…',
  'Adjusting the lens…',
  'Finding a different angle…',
  'Listening more carefully…',
] as const;

const REFINE_PHRASES_LATE = [
  'Almost there…',
  'One more moment…',
  'Just a little longer…',
] as const;

type Props = {
  iso: string;
  dmy: string;
  weekday: string;
  nightTexture: string;
  musicTexture: string;
  image: string;
  result: MoodResponse;
  onSave: (
    feedbackType: 'yes' | 'refined' | 'own',
    note: string,
    ownTitle: string,
    refineInput: string
  ) => Promise<void>;
  onRefined: (newResult: MoodResponse, input: string) => void;
  refinementInput: string;
  manualOnly?: boolean;
  onGoToJournal: () => void;
};

export function FeedbackScreen({
  iso,
  dmy,
  weekday,
  nightTexture,
  musicTexture,
  image,
  result,
  onSave,
  onRefined,
  refinementInput,
  manualOnly = false,
  onGoToJournal,
}: Props) {
  const [selected, setSelected] = useState<'yes' | 'refine' | 'own' | null>(manualOnly ? 'own' : null);
  const [refineText, setRefineText] = useState('');
  const [ownText, setOwnText] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);
  const CHAR_LIMIT = 120;

  useEffect(() => {
    if (manualOnly) {
      setSelected('own');
    }
  }, [manualOnly]);

  return (
    <div className="journal-shell">
      <div className="journal-page journal-page--feedback">
        <Loading.Overlay active={refining} />
        <time className="journal-date-header" dateTime={iso}>
          <span className="journal-date-header__dmy">{dmy}</span>
          <span className="journal-date-header__weekday">{weekday}</span>
        </time>

        <div className="night-scrap-paper" style={{ backgroundImage: `url(${nightTexture})` }} aria-hidden />

        <div className="feedback-screen">
          <p className="feedback-question">
            {manualOnly
              ? "If the mirror is quiet today, what would you call this feeling?"
              : 'Does this capture how you feel today?'}
          </p>

          {!manualOnly && <div className="feedback-vibe-chip">✦ {result.stamp.title}</div>}

          <div className="feedback-options">
            {!manualOnly && (
              <div
                className={`feedback-opt${selected === 'yes' ? ' feedback-opt--sel' : ''}`}
                onClick={() => setSelected('yes')}
              >
                <span className="feedback-opt__icon">💛</span>
                <div className="feedback-opt__body">
                  <p className="feedback-opt__title">Yes, that&apos;s exactly it</p>
                  <p className="feedback-opt__desc">Save this vibe as is</p>
                </div>
              </div>
            )}

            {!manualOnly && (
              <div
                className={`feedback-opt${selected === 'refine' ? ' feedback-opt--sel' : ''}`}
                onClick={() => setSelected('refine')}
              >
                <span className="feedback-opt__icon">🌿</span>
                <div className="feedback-opt__body">
                  <p className="feedback-opt__title">Close, let&apos;s refine it</p>
                  <p className="feedback-opt__desc">Tell the AI what to adjust</p>
                </div>
              </div>
            )}

            {!manualOnly && selected === 'refine' && (
              <div className="feedback-panel">
                <p className="feedback-panel__label">What&apos;s off?</p>
                <div className="feedback-refine-chips">
                  {['Lighter', 'Deeper', 'Warmer', 'Cooler', 'More energetic', 'More still', 'More hopeful', 'More nostalgic'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className={`feedback-chip${refineText === chip ? ' feedback-chip--sel' : ''}`}
                      onClick={() => {
                        setRefineText(chip);
                        setSelectedChip(chip);
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <textarea
                  className="feedback-textarea"
                  placeholder="Or describe what's off…"
                  value={refineText}
                  onChange={(e) => {
                    setRefineText(e.target.value);
                    setSelectedChip(null);
                  }}
                  rows={2}
                />
                {refining ? (
                  <Loading
                    phrasesEarly={REFINE_PHRASES_EARLY}
                    phrasesLate={REFINE_PHRASES_LATE}
                  />
                ) : (
                  <button
                    type="button"
                    className="feedback-cta feedback-cta--secondary"
                    disabled={!selectedChip && !refineText.trim()}
                    onClick={async () => {
                      const refinement = selectedChip || refineText.trim();
                      if (!refinement) return;

                      setRefining(true);
                      try {
                        const response = await fetch('http://localhost:3001/api/refine', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            image,
                            currentVibe: result,
                            refinement,
                          }),
                        });
                        const newResult = await response.json();
                        onRefined(newResult, refinement);
                      } catch (error) {
                        console.error('Error refining:', error);
                      } finally {
                        setRefining(false);
                      }
                    }}
                  >
                    ↺ Re-generate vibe
                  </button>
                )}
              </div>
            )}

            <div
              className={`feedback-opt${selected === 'own' ? ' feedback-opt--sel' : ''}`}
              onClick={() => setSelected('own')}
            >
              <span className="feedback-opt__icon">✏️</span>
              <div className="feedback-opt__body">
                <p className="feedback-opt__title">I&apos;ll describe it myself</p>
                <p className="feedback-opt__desc">Write your own interpretation</p>
              </div>
            </div>

            {selected === 'own' && (
              <div className="feedback-panel">
                <p className="feedback-panel__label">This illustration feels like…</p>
                <textarea
                  className="feedback-textarea"
                  placeholder="That Sunday afternoon feeling when…"
                  value={ownText}
                  onChange={(e) => setOwnText(e.target.value.slice(0, CHAR_LIMIT))}
                  rows={2}
                />
                <p
                  className={`feedback-char-count${
                    ownText.length >= 100
                      ? ownText.length >= 115
                        ? ' feedback-char-count--red'
                        : ' feedback-char-count--amber'
                      : ''
                  }`}
                >
                  {ownText.length}/{CHAR_LIMIT}
                </p>
                <p className="feedback-panel__hint">This becomes the title of your journal entry.</p>
              </div>
            )}
          </div>

          <div className="feedback-note">
            <p className="feedback-note__label">Add a personal note (optional)</p>
            <textarea
              className="feedback-textarea"
              placeholder="What were you feeling when you made this?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          <button
            type="button"
            className="feedback-cta"
            disabled={saving || saved || !selected || (selected === 'own' && !ownText.trim())}
            onClick={async () => {
              if (!selected) return;
              setSaving(true);
              const effectiveFeedbackType =
                selected === 'yes' && refinementInput ? 'refined' : selected;
              const feedbackTypeForSave =
                effectiveFeedbackType === 'refine' ? 'refined' : effectiveFeedbackType;
              await onSave(
                feedbackTypeForSave as 'yes' | 'refined' | 'own',
                note,
                selected === 'own' ? ownText : '',
                selected === 'refine' ? selectedChip || refineText : refinementInput,
              );
              setSaving(false);
              setSaved(true);
              setTimeout(() => onGoToJournal(), 1500);
            }}
          >
            {saving ? 'Saving…' : saved ? 'Saved ✦' : 'Save to my vibe journal'}
          </button>
        </div>

        <JournalFooter onGoToJournal={onGoToJournal} />

        <div className="music-scrap-paper" style={{ backgroundImage: `url(${musicTexture})` }} aria-hidden />
      </div>
    </div>
  );
}
