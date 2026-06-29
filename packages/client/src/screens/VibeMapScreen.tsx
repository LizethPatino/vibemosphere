import { useCallback, useEffect, useMemo, useState } from 'react';
import { getEntryCoordinates, sanitizeMoodTags } from '@vibemosphere/shared';

type MapEntry = {
  id: string;
  created_at: string;
  image_url: string;
  vibe_title: string;
  own_title?: string;
  mood_tags: string[];
};

type Period = 'all' | 'month' | 'week';

type Props = {
  nightTexture: string;
  musicTexture: string;
  onBack: () => void;
};

function getSessionId(): string {
  let sessionId = localStorage.getItem('vibe_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('vibe_session_id', sessionId);
  }
  return sessionId;
}

function getWeekStart(date: Date): Date {
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentWeekKey(now = new Date()): string {
  return toLocalDateKey(getWeekStart(now));
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function filterByPeriod(entries: MapEntry[], period: Period): MapEntry[] {
  if (period === 'all') return entries;

  const now = new Date();
  if (period === 'month') {
    const monthKey = getMonthKey(now);
    return entries.filter((entry) => getMonthKey(new Date(entry.created_at)) === monthKey);
  }

  const weekKey = getCurrentWeekKey(now);
  return entries.filter(
    (entry) => toLocalDateKey(getWeekStart(new Date(entry.created_at))) === weekKey
  );
}

function coordsToPercent(x: number, y: number): { left: string; top: string } {
  return {
    left: `${((x + 1) / 2) * 100}%`,
    top: `${((1 - y) / 2) * 100}%`,
  };
}

function getQuadrantDotClass(x: number, y: number): string {
  if (x >= 0 && y >= 0) return 'vibemap-dot--bright';
  if (x < 0 && y >= 0) return 'vibemap-dot--restless';
  if (x < 0 && y < 0) return 'vibemap-dot--tired';
  return 'vibemap-dot--gentle';
}

export function VibeMapScreen({ nightTexture, musicTexture, onBack }: Props) {
  const [entries, setEntries] = useState<MapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<Period>('all');
  const [hoverEntryId, setHoverEntryId] = useState<string | null>(null);
  const [clickEntryId, setClickEntryId] = useState<string | null>(null);
  const [supportsHover, setSupportsHover] = useState(false);

  useEffect(() => {
    setSupportsHover(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, []);

  useEffect(() => {
    const sessionId = getSessionId();
    fetch('http://localhost:3001/api/entries', {
      headers: { 'x-session-id': sessionId },
    })
      .then((r) => r.json())
      .then((data: { entries?: MapEntry[] } | MapEntry[]) => {
        const list = Array.isArray(data) ? data : data.entries ?? [];
        setEntries(Array.isArray(list) ? list : []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => filterByPeriod(entries, period), [entries, period]);

  const plotted = useMemo(
    () =>
      filtered.map((entry) => {
        const tags = sanitizeMoodTags(entry.mood_tags);
        const coords = getEntryCoordinates(tags);
        return { entry, tags, coords };
      }),
    [filtered]
  );

  const tooltipEntryId = supportsHover ? hoverEntryId : clickEntryId;

  const handleDotClick = useCallback(
    (entryId: string) => {
      if (supportsHover) return;
      setClickEntryId((current) => (current === entryId ? null : entryId));
    },
    [supportsHover]
  );

  const today = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(new Date());

  return (
    <div className="journal-shell">
      <div className="journal-page journal-page--result journal-page--vj journal-page--vibemap">
        <img className="night-scrap-paper" src={nightTexture} alt="" aria-hidden="true" />
        <img className="music-scrap-paper" src={musicTexture} alt="" aria-hidden="true" />

        <div className="journal-date-header" aria-hidden="true">
          <span className="journal-date-header__dmy">{today}</span>
          <span className="journal-date-header__weekday">{weekday}</span>
        </div>

        <header className="journal-heading">
          <h1 className="journal-title">my vibe map</h1>
          <p className="journal-title-sub">where your drawings have been living</p>
        </header>

        <div className="vj-filters" role="group" aria-label="Filter by period">
          {(
            [
              ['all', 'all time'],
              ['month', 'this month'],
              ['week', 'this week'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`vj-filter-chip${period === value ? ' vj-filter-chip--active' : ''}`}
              onClick={() => {
                setPeriod(value);
                setClickEntryId(null);
                setHoverEntryId(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <main className="vj-main vibemap-main">
          {loading && (
            <div className="vj-loading" aria-live="polite">
              <span className="vj-loading__dot" />
              <span className="vj-loading__dot" style={{ animationDelay: '0.18s' }} />
              <span className="vj-loading__dot" style={{ animationDelay: '0.36s' }} />
            </div>
          )}

          {!loading && error && (
            <p className="vj-error">
              Couldn&apos;t load your vibe map. Check your connection and try again.
            </p>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="vj-filter-empty">
              <div className="vjempty__postit">
                <div className="vjempty__postit-tape" />
                <p className="vjempty__postit-q">
                  {entries.length === 0
                    ? 'nothing on the map yet — your drawings will find their place here'
                    : 'nothing on the map for this stretch'}
                </p>
                {entries.length > 0 && period !== 'all' && (
                  <button
                    type="button"
                    className="vj-filter-empty__action"
                    onClick={() => setPeriod('all')}
                  >
                    · try all time ←
                  </button>
                )}
              </div>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="vibemap-plane" role="img" aria-label="Russell circumplex mood map">
              <div className="vibemap-quadrant vibemap-quadrant--restless" aria-hidden="true">
                <span className="vibemap-quadrant__label">restless</span>
              </div>
              <div className="vibemap-quadrant vibemap-quadrant--bright" aria-hidden="true">
                <span className="vibemap-quadrant__label">bright</span>
              </div>
              <div className="vibemap-quadrant vibemap-quadrant--tired" aria-hidden="true">
                <span className="vibemap-quadrant__label">tired</span>
              </div>
              <div className="vibemap-quadrant vibemap-quadrant--gentle" aria-hidden="true">
                <span className="vibemap-quadrant__label">gentle</span>
              </div>

              <div className="vibemap-axis vibemap-axis--x" aria-hidden="true" />
              <div className="vibemap-axis vibemap-axis--y" aria-hidden="true" />

              <span className="vibemap-axis-label vibemap-axis-label--top">activated</span>
              <span className="vibemap-axis-label vibemap-axis-label--bottom">calm</span>
              <span className="vibemap-axis-label vibemap-axis-label--left">unpleasant</span>
              <span className="vibemap-axis-label vibemap-axis-label--right">pleasant</span>

              {plotted.map(({ entry, coords }) => {
                const position = coordsToPercent(coords.x, coords.y);
                const title = entry.own_title || entry.vibe_title;
                const isActive = tooltipEntryId === entry.id;

                return (
                  <div
                    key={entry.id}
                    className="vibemap-dot-wrap"
                    style={{ left: position.left, top: position.top }}
                  >
                    <button
                      type="button"
                      className={`vibemap-dot ${getQuadrantDotClass(coords.x, coords.y)}`}
                      aria-label={title}
                      aria-expanded={isActive}
                      onMouseEnter={() => supportsHover && setHoverEntryId(entry.id)}
                      onMouseLeave={() => supportsHover && setHoverEntryId(null)}
                      onClick={() => handleDotClick(entry.id)}
                    />
                    {isActive && (
                      <div className="vibemap-tooltip" role="tooltip">
                        <img
                          src={entry.image_url}
                          alt=""
                          className="vibemap-tooltip__thumb"
                          loading="lazy"
                        />
                        <p className="vibemap-tooltip__title">{title}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <footer className="journal-footer">
          <span className="journal-footer__line" />
          <button type="button" className="journal-footer__link" onClick={onBack}>
            ← back to journal
          </button>
          <span className="journal-footer__line" />
        </footer>
      </div>
    </div>
  );
}
