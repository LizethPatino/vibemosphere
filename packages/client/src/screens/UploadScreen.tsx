import { type ChangeEvent } from 'react';
import Loading from '../components/Loading';

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
  const polaroidBusy = Boolean(image && loading);

  return (
    <div className="journal-shell">
      <div className="journal-page">
        <time className="journal-date-header" dateTime={iso}>
          <span className="journal-date-header__dmy">{dmy}</span>
          <span className="journal-date-header__weekday">{weekday}</span>
        </time>
        <header className="journal-heading">
          <h1 className="journal-title">Tu ilustración de hoy</h1>
          <p className="journal-title-sub">Veamos qué hay en ella ✨</p>
        </header>

        <div
          className="night-scrap-paper"
          style={{ backgroundImage: `url(${nightTexture})` }}
          aria-hidden
        />

        <div className="polaroid-scene">
          <div className="polaroid-wrap polaroid-wrap--layered">
            <div className={`polaroid${polaroidBusy ? ' polaroid--observing' : ''}`}>
              <label
                className={`polaroid__photo${polaroidBusy ? ' polaroid__photo--interpreting' : ''}`}
                htmlFor="polaroid-upload"
                aria-busy={polaroidBusy}
              >
                <input
                  id="polaroid-upload"
                  className="polaroid__file"
                  type="file"
                  accept="image/*"
                  onChange={onImageChange}
                  disabled={loading}
                />
                {image ? (
                  <>
                    <img
                      className={`polaroid__img${loading ? ' polaroid__img--interpreting' : ''}`}
                      src={image}
                      alt="Vista previa de tu dibujo"
                    />
                    <Loading.Overlay active={loading} />
                  </>
                ) : (
                  <div className="polaroid__placeholder">
                    <span className="polaroid__placeholder-label">Tape your drawing here</span>
                  </div>
                )}
              </label>
              <div className="polaroid__chinstrip" aria-hidden="true" />
            </div>
          </div>
        </div>

        {image && (
          <div className="polaroid-actions">
            {loading ? (
              <Loading />
            ) : (
              <button type="button" className="polaroid-submit" onClick={onAnalyze}>
                Descubrir una vibe
              </button>
            )}
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

