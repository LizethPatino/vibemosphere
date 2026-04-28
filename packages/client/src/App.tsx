import { useState, type CSSProperties } from 'react';
import type { MoodResponse } from '@vibemosphere/shared';
import musicTexture from './assets/music-texture.png';
import nightTexture from './assets/night-texture.png';

function cssHexColor(color: string) {
  const t = color.trim();
  return t.startsWith('#') ? t : `#${t}`;
}

function formatJournalDate(now: Date) {
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = String(now.getFullYear());
  const iso = `${yyyy}-${mm}-${dd}`;
  const dmy = `${dd}/${mm}/${yyyy}`;
  const weekday = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(now);
  return { iso, dmy, weekday };
}

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<MoodResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      
      reader.readAsDataURL(file);
    }
  };

  const analyzeVibe = async () => {
    if (!image) return;
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error al conectar con el cerebro:", error);
      alert("Hubo un problema con la conexión");
    } finally {
      setLoading(false);
    }
  };

  const { iso, dmy, weekday } = formatJournalDate(new Date());

  return (
    <div className="journal-shell">
      <div className="journal-page">
        <time className="journal-date-header" dateTime={iso}>
          <span className="journal-date-header__dmy">{dmy}</span>
          <span className="journal-date-header__weekday">{weekday}</span>
        </time>
        <h1 className="journal-title">¿Qué dibujé hoy?</h1>

        <div
          className="night-scrap-paper"
          style={{ backgroundImage: `url(${nightTexture})` }}
          aria-hidden
        />

        <div className="polaroid-scene">
          <div className="polaroid-wrap polaroid-wrap--layered">
            <div className="polaroid">
              <label className="polaroid__photo" htmlFor="polaroid-upload">
                <input
                  id="polaroid-upload"
                  className="polaroid__file"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {image ? (
                  <img className="polaroid__img" src={image} alt="Vista previa de tu dibujo" />
                ) : (
                  <div className="polaroid__placeholder">
                    <span className="polaroid__placeholder-label">Tape your drawing here</span>
                  </div>
                )}
              </label>
              <div className="polaroid__chin" aria-hidden="true">
                <span className="polaroid__ctrl">⏮</span>
                <span className="polaroid__ctrl">⏸</span>
                <span className="polaroid__ctrl">⏭</span>
              </div>
            </div>
          </div>
        </div>

        {image && (
          <div className="polaroid-actions">
            <button
              type="button"
              className="polaroid-submit"
              onClick={analyzeVibe}
              disabled={loading}
            >
              {loading ? 'Analizando vibra...' : 'Generar Estampilla'}
            </button>
          </div>
        )}

        {result && (
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
                <div className="polaroid__photo polaroid__photo--static polaroid__photo--fluid">
                  <div className="vibe-result vibe-result--in-polaroid">
                    <p className="stamp-micro">{result.stamp.microDescription}</p>
                    <h2>{result.stamp.title}</h2>
                    <span
                      className="stamp-swatch"
                      style={{ backgroundColor: cssHexColor(result.stamp.color) }}
                      title={cssHexColor(result.stamp.color)}
                      aria-hidden
                    />
                    <hr />
                  </div>
                </div>
                <div className="polaroid__chin" aria-hidden="true">
                  <span className="polaroid__ctrl">⏮</span>
                  <span className="polaroid__ctrl">⏸</span>
                  <span className="polaroid__ctrl">⏭</span>
                </div>
              </div>
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
        )}

        <div
          className="music-scrap-paper"
          style={{ backgroundImage: `url(${musicTexture})` }}
          aria-hidden
        />
      </div>
    </div>
  )
}

export default App