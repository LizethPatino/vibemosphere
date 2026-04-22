import { useState } from 'react'
import type { MoodResponse } from '@vibemosphere/shared';
import musicTexture from './assets/music-texture.png';
import nightTexture from './assets/night-texture.png';

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

  return (
    <div className="journal-shell">
      <div className="journal-page">
        <h1 className="journal-title">Vibemosphere</h1>

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
              <div className="polaroid polaroid--result">
                <div className="polaroid__photo polaroid__photo--static polaroid__photo--fluid">
                  <div className="vibe-result vibe-result--in-polaroid">
                    <h2>{result.vibe.label}</h2>
                    <p>
                      <i>{`"${result.quote.text}"`}</i>
                    </p>
                    <p>— {result.quote.author} ({result.quote.source})</p>
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
              <span className="music-query-card__kicker">Búsqueda musical</span>
              <p className="music-query-card__query">{result.musicSearchQuery}</p>
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