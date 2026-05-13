import { useState, useEffect, type CSSProperties } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type JournalEntry = {
  id: string;
  created_at: string;
  image_url: string;
  vibe_title: string;
  mood_tags: string[];
  music: string;
  why_text: string;
  feedback_type: 'yes' | 'refined' | 'own';
  personal_note?: string;
  own_title?: string;
};

type Props = {
  nightTexture: string;
  musicTexture: string;
  onBack: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSessionId(): string {
  let sessionId = localStorage.getItem('vibe_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('vibe_session_id', sessionId);
  }
  return sessionId;
}

function formatEntryDate(iso: string): { short: string; weekday: string } {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(d);
  return { short: `${dd}/${mm}/${yyyy}`, weekday };
}

function parseMusic(music: string): { title: string; artist: string } {
  const parts = music.split('–').map((s) => s.trim());
  if (parts.length >= 2) return { title: parts[0], artist: parts[1] };
  const parts2 = music.split('-').map((s) => s.trim());
  if (parts2.length >= 2) return { title: parts2[0], artist: parts2[1] };
  return { title: music, artist: '' };
}

function groupEntriesByWeek(entries: JournalEntry[]): {
  label: string;
  weekKey: string;
  entries: JournalEntry[];
}[] {
  const groups: Record<string, JournalEntry[]> = {};

  entries.forEach((entry) => {
    const d = new Date(entry.created_at);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const key = monday.toISOString().split('T')[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  });

  const now = new Date();
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  thisMonday.setHours(0, 0, 0, 0);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, entries]) => {
      const keyDate = new Date(key);
      let label: string;
      if (keyDate.getTime() === thisMonday.getTime()) {
        label = 'this week';
      } else if (keyDate.getTime() === lastMonday.getTime()) {
        label = 'last week';
      } else {
        label = new Intl.DateTimeFormat('en-GB', {
          month: 'long',
          year: 'numeric',
        }).format(keyDate);
      }
      return { label, weekKey: key, entries };
    });
}

// ─── Polaroid card ────────────────────────────────────────────────────────────

function PolaroidCard({
  entry,
  index,
  onClick,
}: {
  entry: JournalEntry;
  index: number;
  onClick: () => void;
}) {
  const { short, weekday } = formatEntryDate(entry.created_at);
  const { title: songTitle } = parseMusic(entry.music);

  // Slight random rotation for handmade feel — seeded by id so stable
  const seed = entry.id.charCodeAt(0) + entry.id.charCodeAt(1);
  const rotate = ((seed % 7) - 3) * 0.6; // –1.8 to +1.8 deg

  const displayTitle = entry.own_title || entry.vibe_title;

  return (
    <button
      className="vjcard"
      style={
        {
          '--card-rotate': `${rotate}deg`,
          animationDelay: `${index * 60}ms`,
        } as CSSProperties
      }
      onClick={onClick}
      aria-label={`Open entry: ${displayTitle}`}
    >
      {/* Washi tape strip */}
      <span className="vjcard__tape" aria-hidden="true" />

      {/* Polaroid frame */}
      <div className="vjcard__photo-wrap">
        <img
          src={entry.image_url}
          alt={displayTitle}
          className="vjcard__photo"
          loading="lazy"
        />
      </div>

      {/* Chin strip */}
      <div className="vjcard__chin">
        <p className="vjcard__title">{displayTitle}</p>
        <p className="vjcard__date">
          <span className="vjcard__weekday">{weekday}</span>
          <span className="vjcard__dmy">{short}</span>
        </p>
      </div>

      {/* Mood tags row */}
      <div className="vjcard__tags" aria-label="Mood tags">
        {entry.mood_tags.slice(0, 3).map((tag) => (
          <span key={tag} className="vjcard__tag">
            {tag}
          </span>
        ))}
      </div>

      {/* Song pill */}
      {songTitle && <p className="vjcard__song">♪ {songTitle}</p>}

      {/* Refined badge */}
      {entry.feedback_type === 'refined' && (
        <span className="vjcard__badge" title="Vibe was refined">
          ✦
        </span>
      )}
    </button>
  );
}

const WEEK_PREVIEW = 4;

function WeekSection({
  label,
  entries,
  isFirst,
  insight,
  insightLoading,
  onEntryClick,
}: {
  label: string;
  weekKey: string;
  entries: JournalEntry[];
  isFirst: boolean;
  insight: string | null;
  insightLoading: boolean;
  onEntryClick: (entry: JournalEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? entries : entries.slice(0, WEEK_PREVIEW);
  const hidden = entries.length - WEEK_PREVIEW;

  return (
    <div className="vj-week-section">
      <div className="vj-week-header">
        <span className="vj-week-line" />
        <span className="vj-week-label">{label}</span>
        {isFirst && insight && (
          <span className="vj-week-insight">{insight} ✦</span>
        )}
        {isFirst && insightLoading && (
          <span className="vj-week-insight vj-week-insight--loading">
            reading the week…
          </span>
        )}
        <span className="vj-week-line" />
      </div>

      <div className="vj-grid">
        {visible.map((entry, i) => (
          <PolaroidCard
            key={entry.id}
            entry={entry}
            index={i}
            onClick={() => onEntryClick(entry)}
          />
        ))}
      </div>

      {!expanded && hidden > 0 && (
        <div className="vj-expand-row">
          <span className="vj-expand-line" />
          <button
            className="vj-expand-btn"
            onClick={() => setExpanded(true)}
          >
            <span className="vj-expand-count">+{hidden}</span>
            show all {label}
          </button>
          <span className="vj-expand-line" />
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <div className="vjempty">

      <div className="vjempty__top">
        <div className="vjempty__pol vjempty__pol--1">
          <div className="vjempty__tape" />
          <div className="vjempty__photo vjempty__photo--1" />
        </div>
        <div className="vjempty__pol vjempty__pol--2">
          <div className="vjempty__photo vjempty__photo--2" />
        </div>
      </div>

      <div className="vjempty__mid">
        <div className="vjempty__postit">
          <div className="vjempty__postit-tape" />
          <p className="vjempty__postit-q">
            what feeling are you<br />drawing today?
          </p>
        </div>
      </div>

      <div className="vjempty__bottom">
        <div className="vjempty__pol vjempty__pol--3">
          <div className="vjempty__photo vjempty__photo--3" />
        </div>
        <div className="vjempty__copy">
          <p className="vjempty__hl-strong">
            Something hides in every drawing.
          </p>
          <p className="vjempty__hl-soft">
            What's hiding in yours?
          </p>
          <button className="vjempty__cta" onClick={onBack}>
            Tape a drawing ✦
          </button>
        </div>
      </div>

      <span className="vjempty__star vjempty__star--1" aria-hidden="true">★</span>
      <span className="vjempty__star vjempty__star--2" aria-hidden="true">★</span>
      <span className="vjempty__star vjempty__star--3" aria-hidden="true">★</span>

    </div>
  );
}

// ─── Detail overlay ───────────────────────────────────────────────────────────

function EntryDetail({
  entry,
  onClose,
}: {
  entry: JournalEntry;
  onClose: () => void;
}) {
  const { short, weekday } = formatEntryDate(entry.created_at);
  const { title: songTitle, artist } = parseMusic(entry.music);
  const displayTitle = entry.own_title || entry.vibe_title;
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(entry.music)}`;

  return (
    <div className="vjdetail-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="vjdetail" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="vjdetail__close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="vjdetail__polaroid">
          <img src={entry.image_url} alt={displayTitle} className="vjdetail__img" />
          <div className="vjdetail__chin">
            <p className="vjdetail__chin-title">{displayTitle}</p>
          </div>
        </div>

        <div className="vjdetail__meta">
          <p className="vjdetail__date">
            {weekday} · {short}
          </p>
          <div className="vjdetail__tags">
            {entry.mood_tags.map((tag) => (
              <span key={tag} className="result-vibe-tag">
                {tag}
              </span>
            ))}
          </div>
          {entry.why_text && <p className="vjdetail__why">{entry.why_text}</p>}
          {entry.personal_note && <p className="vjdetail__note">&quot;{entry.personal_note}&quot;</p>}
        </div>

        {/* Music ticket */}
        <a
          className="vjdetail__ticket result-music__ticket"
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${entry.music} on YouTube`}
        >
          <div className="result-music__stub">
            <span className="result-music__stub-note">♪</span>
          </div>
          <div className="result-music__perf" />
          <div className="result-music__body">
            <p className="result-music__label">To accompany this moment</p>
            <p className="result-music__title">{songTitle}</p>
            {artist && <p className="result-music__artist">{artist}</p>}
            <div className="result-music__footer">
              <span className="result-music__admit">Admit one · open in</span>
              <span className="result-music__yt">YouTube ↗</span>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function JournalScreen({ nightTexture, musicTexture, onBack }: Props) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [expandedDetail, setExpandedDetail] = useState<JournalEntry | null>(null);

  // Fetch entries
  useEffect(() => {
    const sessionId = getSessionId();
    fetch('http://localhost:3001/api/entries', {
      headers: { 'x-session-id': sessionId },
    })
      .then((r) => r.json())
      .then((data: { entries?: JournalEntry[] } | JournalEntry[]) => {
        const list = Array.isArray(data) ? data : data.entries ?? [];
        setEntries(Array.isArray(list) ? list : []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (entries.length < 3) return;
    const now = new Date();
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    thisMonday.setHours(0, 0, 0, 0);
    const thisWeekEntries = entries.filter((e) => {
      const d = new Date(e.created_at);
      const entryMonday = new Date(d);
      entryMonday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      entryMonday.setHours(0, 0, 0, 0);
      return entryMonday.getTime() === thisMonday.getTime();
    });
    if (thisWeekEntries.length < 3) return;
    setInsightLoading(true);
    const sessionId = getSessionId();
    fetch('http://localhost:3001/api/insight', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId,
      },
      body: JSON.stringify({
        moodTags: thisWeekEntries.flatMap((e) => e.mood_tags),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        setInsight(data.insight ?? null);
        setInsightLoading(false);
      })
      .catch(() => setInsightLoading(false));
  }, [entries]);

  // All unique mood tags across entries
  const allTags = Array.from(new Set(entries.flatMap((e) => e.mood_tags))).sort();

  const filtered = activeTag ? entries.filter((e) => e.mood_tags.includes(activeTag)) : entries;

  const today = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(new Date());

  return (
    <>
      <div className="journal-shell">
        <div className="journal-page journal-page--result journal-page--vj">
          {/* Decorative textures */}
          <img className="night-scrap-paper" src={nightTexture} alt="" aria-hidden="true" />
          <img className="music-scrap-paper" src={musicTexture} alt="" aria-hidden="true" />

          {/* Date header */}
          <div className="journal-date-header" aria-hidden="true">
            <span className="journal-date-header__dmy">{today}</span>
            <span className="journal-date-header__weekday">{weekday}</span>
          </div>

          {/* Page heading */}
          <header className="vj-header">
            <h1 className="journal-title vj-title">vibe journal</h1>
            {entries.length > 0 && (
              <p className="vj-subtitle">
                {entries.length} {entries.length === 1 ? 'illustration' : 'illustrations'} · {allTags.length}{' '}
                moods
              </p>
            )}
          </header>

          {/* Mood tag filter */}
          {allTags.length > 0 && (
            <div className="vj-filters" role="group" aria-label="Filter by mood">
              <button
                type="button"
                className={`vj-filter-chip${activeTag === null ? ' vj-filter-chip--active' : ''}`}
                onClick={() => setActiveTag(null)}
              >
                all
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`vj-filter-chip${activeTag === tag ? ' vj-filter-chip--active' : ''}`}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <main className="vj-main">
            {loading && (
              <div className="vj-loading" aria-live="polite">
                <span className="vj-loading__dot" />
                <span className="vj-loading__dot" style={{ animationDelay: '0.18s' }} />
                <span className="vj-loading__dot" style={{ animationDelay: '0.36s' }} />
              </div>
            )}

            {error && (
              <p className="vj-error">Couldn&apos;t load your journal. Check your connection and try again.</p>
            )}

            {!loading && !error && filtered.length === 0 && (
              <EmptyState onBack={onBack} />
            )}

            {!loading && !error && filtered.length > 0 &&
              (activeTag ? (
                <div className="vj-grid">
                  {filtered.map((entry, i) => (
                    <PolaroidCard
                      key={entry.id}
                      entry={entry}
                      index={i}
                      onClick={() => setExpandedDetail(entry)}
                    />
                  ))}
                </div>
              ) : (
                <div className="vj-weeks">
                  {groupEntriesByWeek(filtered).map((group, i) => (
                    <WeekSection
                      key={group.weekKey}
                      label={group.label}
                      weekKey={group.weekKey}
                      entries={group.entries}
                      isFirst={i === 0}
                      insight={insight}
                      insightLoading={insightLoading}
                      onEntryClick={setExpandedDetail}
                    />
                  ))}
                </div>
              ))}
          </main>

          {/* Footer */}
          {entries.length > 0 && (
            <footer className="journal-footer">
              <span className="journal-footer__line" />
              <button type="button" className="journal-footer__link" onClick={onBack}>
                ✦ new illustration ✦
              </button>
              <span className="journal-footer__line" />
            </footer>
          )}
        </div>
      </div>

      {/* Detail overlay */}
      {expandedDetail && (
        <EntryDetail entry={expandedDetail} onClose={() => setExpandedDetail(null)} />
      )}
    </>
  );
}
