import { useId, useState } from 'react';
import type { MoodResponse } from '@vibemosphere/shared';
import { Divider } from '../components/Divider';

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
              <p className="result-vibe-micro">{result.stamp.microDescription}</p>
              <div className="result-vibe-tags">
                {result.stamp.microDescription.split(',').map((tag, i) => (
                  <span key={i} className="result-vibe-tag">
                    {tag.trim().replace('.', '')}
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
              <div className="result-music__scrap">
                <p className="result-music__label">To accompany this moment</p>
                <a
                  className="result-music__line result-music__line--link"
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(result.stamp.music)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🎧 {result.stamp.music} ↗
                </a>
                <div className="result-music__controls" role="group" aria-label="Music controls">
                  <button type="button" className="result-music__ctrl" aria-label="Previous">
                    ⏮
                  </button>
                  <button type="button" className="result-music__ctrl" aria-label="Pause">
                    ⏸
                  </button>
                  <button type="button" className="result-music__ctrl" aria-label="Next">
                    ⏭
                  </button>
                </div>
              </div>
            </section>

            <button type="button" className="result-next-cta" onClick={onGoToFeedback}>
              Does this feel right? →
            </button>
          </div>
        </div>

        <div
          className="music-scrap-paper"
          style={{ backgroundImage: `url(${musicTexture})` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
