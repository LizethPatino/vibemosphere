import type { ChangeEvent } from 'react';

type Props = {
  iso: string;
  dmy: string;
  weekday: string;
  nightTexture: string;
  musicTexture: string;
  image: string | null;
  loading: boolean;
  onImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onAnalyze: () => void;
};

export function UploadScreen({
  iso,
  dmy,
  weekday,
  nightTexture,
  musicTexture,
  image,
  loading,
  onImageChange,
  onAnalyze,
}: Props) {
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
                  onChange={onImageChange}
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
              onClick={onAnalyze}
              disabled={loading}
            >
              {loading ? 'Analizando vibra...' : 'Generar Estampilla'}
            </button>
          </div>
        )}

        <div
          className="music-scrap-paper"
          style={{ backgroundImage: `url(${musicTexture})` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

