import type { CSSProperties } from 'react';
import type { MoodResponse } from '@vibemosphere/shared';

function cssHexColor(color: string) {
  const t = color.trim();
  return t.startsWith('#') ? t : `#${t}`;
}

type Props = {
  iso: string;
  dmy: string;
  weekday: string;
  nightTexture: string;
  musicTexture: string;
  image: string;
  result: MoodResponse;
};

export function ResultScreen({
  iso,
  dmy,
  weekday,
  nightTexture,
  musicTexture,
  image,
  result,
}: Props) {
  return (
    <div className="journal-shell">
      <div className="journal-page">
        <time className="journal-date-header" dateTime={iso}>
          <span className="journal-date-header__dmy">{dmy}</span>
          <span className="journal-date-header__weekday">{weekday}</span>
        </time>
        <h1 className="journal-title">Tu estampilla</h1>

        <div
          className="night-scrap-paper"
          style={{ backgroundImage: `url(${nightTexture})` }}
          aria-hidden
        />

        <div className="result-layer-stack">
          <div className="polaroid-wrap polaroid-wrap--result polaroid-wrap--layered">
            <div
              className="polaroid polaroid--result"
              style={
                {
                  ['--vibe-accent']: cssHexColor(result.stamp.color),
                } as CSSProperties
              }
            >
              <div className="polaroid__photo polaroid__photo--static">
                <img className="polaroid__img" src={image} alt="Tu dibujo" />
              </div>
              <div className="polaroid__chin" aria-hidden="true">
                <span className="polaroid__ctrl">⏮</span>
                <span className="polaroid__ctrl">⏸</span>
                <span className="polaroid__ctrl">⏭</span>
              </div>
            </div>
          </div>

          <div className="journal-note journal-note--reflection">
            <p className="stamp-micro">{result.stamp.microDescription}</p>
            <h2 className="stamp-title">{result.stamp.title}</h2>
            <span
              className="stamp-swatch"
              style={{ backgroundColor: cssHexColor(result.stamp.color) }}
              title={cssHexColor(result.stamp.color)}
              aria-hidden
            />
          </div>

          <div className="music-query-card">
            <span className="music-query-card__kicker">Vibra musical</span>
            <p className="music-query-card__query">{result.stamp.music}</p>
          </div>

          <div className="journal-note journal-note--interaction">
            <p className="journal-note__lead">{result.interaction.question}</p>
            {Array.isArray(result.interaction.adjustmentSuggestions) &&
              result.interaction.adjustmentSuggestions.length > 0 && (
                <ul className="journal-note__chips">
                  {result.interaction.adjustmentSuggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              )}
          </div>

          <div className="journal-note journal-note--reflection">
            <p className="journal-note__body">{result.reflection.description}</p>
            {Array.isArray(result.reflection.alternativeVibes) &&
              result.reflection.alternativeVibes.length > 0 && (
                <ul className="journal-note__alts">
                  {result.reflection.alternativeVibes.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              )}
            <blockquote className="journal-note__quote">
              <p>
                <i>{`"${result.reflection.quote.text}"`}</i>
              </p>
              <footer>
                — {result.reflection.quote.author} ({result.reflection.quote.source})
              </footer>
            </blockquote>
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

