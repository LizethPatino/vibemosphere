import { useId, useState } from 'react';
import type { MoodResponse } from '@vibemosphere/shared';
import { Divider } from '../components/Divider';
import { JournalFooter } from '../components/JournalFooter';

/** Quita rótulos meta que a veces devuelve el modelo (p. ej. secciones entre paréntesis). */
function stripAiMetaLabels(text: string) {
  return text
    .replace(/\s*\(Philosophical observation\)\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function vibeWhyText(result: MoodResponse) {
  const d = result.stamp.description?.trim();
  if (d) return stripAiMetaLabels(d);
  return stripAiMetaLabels(result.reflection.description);
}

type Props = {
  iso: string;
  dmy: string;
  weekday: string;
  nightTexture: string;
  musicTexture: string;
  image: string;
  result: MoodResponse;
  onGoToFeedback: () => void;
};

export function ResultScreen({
  iso,
  dmy,
  weekday,
  nightTexture,
  musicTexture,
  image,
  result,
  onGoToFeedback,
}: Props) {
  const [whyOpen, setWhyOpen] = useState(false);
  const whyPanelId = useId();
  const whyHeadingId = useId();

  return (
    <div className="journal-shell">
      <div className="journal-page journal-page--result">
        <time className="journal-date-header" dateTime={iso}>
          <span className="journal-date-header__dmy">{dmy}</span>
          <span className="journal-date-header__weekday">{weekday}</span>
        </time>

        <div
          className="night-scrap-paper"
          style={{ backgroundImage: `url(${nightTexture})` }}
          aria-hidden
        />

        <div className="result-layer-stack result-screen">
          <div className="result-top">
            <div className="result-top__visual">
              <div className="polaroid-wrap polaroid-wrap--result polaroid-wrap--layered">
                <div className="polaroid polaroid--result">
                  <div className="polaroid__photo polaroid__photo--static">
                    <img className="polaroid__img" src={image} alt="Your illustration" />
                  </div>
                  <div className="polaroid__chinstrip" aria-hidden="true" />
                </div>
              </div>
              <figure className="result-visual-quote">
                <blockquote className="result-visual-quote__text">
                  <p>“{result.reflection.quote.text}”</p>
                </blockquote>
                <figcaption className="result-visual-quote__meta">
                  — {result.reflection.quote.author}  — 
                  <span className="result-visual-quote__source">
                    {' '}
                    ({result.reflection.quote.source})
                  </span>
                </figcaption>
              </figure>
            </div>

            <div className="result-top__copy">
              <p className="result-vibe-label">It feels like…</p>
              <h2 className="result-vibe-title">{result.stamp.title}</h2>
              <div className="result-vibe-tags">
                {result.stamp.moodTags.map((tag, i) => (
                  <span key={i} className="result-vibe-tag">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="vibe-why vibe-why--result">
                <button
                  type="button"
                  className="vibe-why__cta"
                  aria-expanded={whyOpen}
                  aria-controls={whyPanelId}
                  onClick={() => setWhyOpen((o) => !o)}
                >
                  Why this vibe?
                </button>
                <div
                  id={whyPanelId}
                  role="region"
                  aria-labelledby={whyHeadingId}
                  aria-hidden={!whyOpen}
                  className={`vibe-why__shell${whyOpen ? ' vibe-why__shell--open' : ''}`}
                >
                  <div className="vibe-why__inner">
                    <div className="vibe-why__body">
                      <p className="vibe-why__text">{vibeWhyText(result)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Divider />

          <div className="result-bottom">
            <section className="result-music" aria-label="Music suggestion">
              <a
                className="result-music__ticket"
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(result.stamp.music)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Listen to ${result.stamp.music} on YouTube`}
              >
                <div className="result-music__stub">
                  <span className="result-music__stub-note">♪</span>
                  <span className="result-music__stub-text">listen</span>
                </div>
                <div className="result-music__perf">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className="result-music__perf-dot" />
                  ))}
                </div>
                <div className="result-music__body">
                  <p className="result-music__label">To accompany this moment</p>
                  <p className="result-music__title">
                    {result.stamp.music.includes('–')
                      ? result.stamp.music.split('–')[0].trim()
                      : result.stamp.music}
                  </p>
                  {result.stamp.music.includes('–') && (
                    <p className="result-music__artist">
                      {result.stamp.music.split('–')[1].trim()}
                    </p>
                  )}
                  <div className="result-music__footer">
                    <span className="result-music__admit">Admit one · open in</span>
                    <span className="result-music__yt">
                      YouTube
                      <svg
                        viewBox="0 0 24 24"
                        width="8"
                        height="8"
                        stroke="currentColor"
                        fill="none"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </span>
                  </div>
                </div>
              </a>
            </section>

            <button type="button" className="result-next-cta" onClick={onGoToFeedback}>
              Does this feel right? →
            </button>
          </div>
        </div>

        <JournalFooter />

        <div
          className="music-scrap-paper"
          style={{ backgroundImage: `url(${musicTexture})` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
