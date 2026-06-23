import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

type JournalEntry = {
  id: string;
  created_at: string;
  image_url: string;
  vibe_title: string;
  mood_tags: string[];
  music: string;
  music_url?: string;
  why_text: string;
  feedback_type: 'yes' | 'refined' | 'own';
  personal_note?: string;
  own_title?: string;
};

type JournalGroup = {
  label: string;
  weekKey: string;
  entries: JournalEntry[];
  kind: 'week' | 'month';
  monthKey: string;
};

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

function formatWeekRangeLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const startDay = String(weekStart.getDate()).padStart(2, '0');
  const endDay = String(weekEnd.getDate()).padStart(2, '0');
  const startMonth = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(weekStart);
  const endMonth = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(weekEnd);

  if (weekStart.getFullYear() !== weekEnd.getFullYear()) {
    return `${startMonth} ${startDay} ${weekStart.getFullYear()} - ${endMonth} ${endDay} ${weekEnd.getFullYear()}`;
  }

  if (weekStart.getMonth() !== weekEnd.getMonth()) {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  }

  return `${startMonth} ${startDay} - ${endDay}`;
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function buildGroupEntrySignature(entryIds: string[]): string {
  return [...entryIds].sort().join(',');
}

function buildInsightCacheKey(sessionId: string, groupKey: string): string {
  return `vibe_insight:${sessionId}:${groupKey}`;
}

function readInsightCache(
  cacheKey: string,
): { entrySignature: string; insight: string } | null {
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) return null;
    const data = JSON.parse(raw) as { entrySignature?: string; insight?: string };
    if (typeof data.entrySignature !== 'string' || typeof data.insight !== 'string') {
      return null;
    }
    return { entrySignature: data.entrySignature, insight: data.insight };
  } catch {
    return null;
  }
}

function writeInsightCache(
  cacheKey: string,
  entrySignature: string,
  insight: string,
): void {
  sessionStorage.setItem(cacheKey, JSON.stringify({ entrySignature, insight }));
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

function groupEntriesForJournal(entries: JournalEntry[]): JournalGroup[] {
  const groups: Record<
    string,
    { label: string; sortKey: string; entries: JournalEntry[]; kind: 'week' | 'month'; monthKey: string }
  > = {};

  const now = new Date();
  const thisWeekKey = getCurrentWeekKey(now);
  const currentMonthKey = getMonthKey(now);
  const lastMonday = getWeekStart(now);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastWeekKey = toLocalDateKey(lastMonday);

  entries.forEach((entry) => {
    const entryDate = new Date(entry.created_at);
    const weekStart = getWeekStart(entryDate);
    const weekKey = toLocalDateKey(weekStart);
    const monthKey = getMonthKey(entryDate);

    let groupKey: string;
    let label: string;
    let sortKey: string;
    let kind: 'week' | 'month';

    if (weekKey === thisWeekKey) {
      groupKey = `week:${weekKey}`;
      label = 'this week';
      sortKey = weekKey;
      kind = 'week';
    } else if (weekKey === lastWeekKey || monthKey === currentMonthKey) {
      groupKey = `week:${weekKey}`;
      label = formatWeekRangeLabel(weekStart);
      sortKey = weekKey;
      kind = 'week';
    } else {
      groupKey = `month:${monthKey}`;
      label = formatMonthLabel(new Date(entryDate.getFullYear(), entryDate.getMonth(), 1));
      sortKey = `${monthKey}-01`;
      kind = 'month';
    }

    if (!groups[groupKey]) {
      groups[groupKey] = { label, sortKey, entries: [], kind, monthKey };
    }

    groups[groupKey].entries.push(entry);
  });

  return Object.entries(groups)
    .sort(([, a], [, b]) => b.sortKey.localeCompare(a.sortKey))
    .map(([key, group]) => {
      const sortedEntries = [...group.entries].sort((a, b) =>
        b.created_at.localeCompare(a.created_at)
      );
      return {
        label: group.label,
        weekKey: key,
        entries: sortedEntries,
        kind: group.kind,
        monthKey: group.monthKey,
      };
    });
}

const PolaroidCard = memo(function PolaroidCard({
  entry,
  index,
  onEntryClick,
}: {
  entry: JournalEntry;
  index: number;
  onEntryClick: (entry: JournalEntry) => void;
}) {
  const { short, weekday } = formatEntryDate(entry.created_at);
  const { title: songTitle } = parseMusic(entry.music);

  const seed = entry.id.charCodeAt(0) + entry.id.charCodeAt(1);
  const rotate = ((seed % 7) - 3) * 0.6;

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
      onClick={() => onEntryClick(entry)}
      aria-label={`Open entry: ${displayTitle}`}
    >
      <span className="vjcard__tape" aria-hidden="true" />

      <div className="vjcard__photo-wrap">
        <img
          src={entry.image_url}
          alt={displayTitle}
          className="vjcard__photo"
          loading="lazy"
        />
      </div>

      <div className="vjcard__chin">
        <p className="vjcard__title">{displayTitle}</p>
        <p className="vjcard__date">
          <span className="vjcard__weekday">{weekday}</span>
          <span className="vjcard__dmy">{short}</span>
        </p>
      </div>

      <div className="vjcard__tags" aria-label="Mood tags">
        {entry.mood_tags.slice(0, 3).map((tag) => (
          <span key={tag} className="vjcard__tag">
            {tag}
          </span>
        ))}
      </div>

      {songTitle && <p className="vjcard__song">♪ {songTitle}</p>}

      {entry.feedback_type === 'refined' && (
        <span className="vjcard__badge" title="Vibe was refined">
          ✦
        </span>
      )}
    </button>
  );
});

const WEEK_PREVIEW = 4;
const JOURNAL_SCROLL_BATCH = 1;

const WeekSection = memo(function WeekSection({
  label,
  entries,
  insight,
  insightLoading,
  onEntryClick,
}: {
  label: string;
  weekKey: string;
  entries: JournalEntry[];
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
        {insight && (
          <span className="vj-week-insight">{insight} ✦</span>
        )}
        {insightLoading && (
          <span className="vj-week-insight vj-week-insight--loading">
            reading this section…
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
            onEntryClick={onEntryClick}
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
});

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

const JournalEntryList = memo(function JournalEntryList({
  loading,
  error,
  filtered,
  activeTag,
  onBack,
  onEntryClick,
}: {
  loading: boolean;
  error: boolean;
  filtered: JournalEntry[];
  activeTag: string | null;
  onBack: () => void;
  onEntryClick: (entry: JournalEntry) => void;
}) {
  const groups = useMemo(() => groupEntriesForJournal(filtered), [filtered]);
  const currentMonthKey = getMonthKey(new Date());
  const initialVisibleGroupCount = useMemo(() => {
    const firstOlderMonthIndex = groups.findIndex(
      (group) => group.kind === 'month' && group.monthKey !== currentMonthKey
    );
    return firstOlderMonthIndex === -1 ? groups.length : Math.max(1, firstOlderMonthIndex);
  }, [currentMonthKey, groups]);
  const [visibleGroupCount, setVisibleGroupCount] = useState(initialVisibleGroupCount);
  const [insightByGroup, setInsightByGroup] = useState<
    Record<string, { entrySignature: string; insight: string }>
  >({});
  const [insightLoadingByGroup, setInsightLoadingByGroup] = useState<Record<string, boolean>>({});
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const attemptedInsightSignaturesRef = useRef<Record<string, string>>({});
  const insightByGroupRef = useRef(insightByGroup);
  const insightLoadingByGroupRef = useRef(insightLoadingByGroup);
  const visibleGroups = useMemo(
    () => groups.slice(0, visibleGroupCount),
    [groups, visibleGroupCount]
  );

  useEffect(() => {
    setVisibleGroupCount(initialVisibleGroupCount);
  }, [initialVisibleGroupCount]);

  useEffect(() => {
    insightByGroupRef.current = insightByGroup;
  }, [insightByGroup]);

  useEffect(() => {
    insightLoadingByGroupRef.current = insightLoadingByGroup;
  }, [insightLoadingByGroup]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || visibleGroupCount >= groups.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleGroupCount((current) =>
          current >= groups.length ? current : Math.min(groups.length, current + JOURNAL_SCROLL_BATCH)
        );
      },
      { rootMargin: '240px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [groups.length, visibleGroupCount]);

  useEffect(() => {
    const sessionId = getSessionId();
    visibleGroups.forEach((group) => {
      if (group.entries.length < 3) return;

      const entrySignature = buildGroupEntrySignature(group.entries.map((entry) => entry.id));
      const existing = insightByGroupRef.current[group.weekKey];
      if (existing?.entrySignature === entrySignature) return;
      if (insightLoadingByGroupRef.current[group.weekKey]) return;

      const cacheKey = buildInsightCacheKey(sessionId, group.weekKey);
      const cached = readInsightCache(cacheKey);
      if (cached?.entrySignature === entrySignature) {
        insightByGroupRef.current = { ...insightByGroupRef.current, [group.weekKey]: cached };
        setInsightByGroup((current) => ({ ...current, [group.weekKey]: cached }));
        return;
      }

      if (attemptedInsightSignaturesRef.current[group.weekKey] === entrySignature) {
        return;
      }

      attemptedInsightSignaturesRef.current[group.weekKey] = entrySignature;
      insightLoadingByGroupRef.current = {
        ...insightLoadingByGroupRef.current,
        [group.weekKey]: true,
      };
      setInsightLoadingByGroup((current) => ({ ...current, [group.weekKey]: true }));

      fetch('http://localhost:3001/api/insight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          moodTags: group.entries.flatMap((entry) => entry.mood_tags),
          periodLabel: group.label,
          periodKind: group.kind,
        }),
      })
        .then((response) => response.json())
        .then((data: { insight?: string }) => {
          const nextInsight = data.insight?.trim();
          if (!nextInsight) return;

          const nextValue = { entrySignature, insight: nextInsight };
          insightByGroupRef.current = {
            ...insightByGroupRef.current,
            [group.weekKey]: nextValue,
          };
          setInsightByGroup((current) => ({ ...current, [group.weekKey]: nextValue }));
          writeInsightCache(cacheKey, entrySignature, nextInsight);
        })
        .catch(() => {
          delete attemptedInsightSignaturesRef.current[group.weekKey];
        })
        .finally(() => {
          insightLoadingByGroupRef.current = {
            ...insightLoadingByGroupRef.current,
            [group.weekKey]: false,
          };
          setInsightLoadingByGroup((current) => ({ ...current, [group.weekKey]: false }));
        });
    });
  }, [visibleGroups]);

  if (loading) {
    return (
      <div className="vj-loading" aria-live="polite">
        <span className="vj-loading__dot" />
        <span className="vj-loading__dot" style={{ animationDelay: '0.18s' }} />
        <span className="vj-loading__dot" style={{ animationDelay: '0.36s' }} />
      </div>
    );
  }

  if (error) {
    return (
      <p className="vj-error">Couldn&apos;t load your journal. Check your connection and try again.</p>
    );
  }

  if (filtered.length === 0) {
    return <EmptyState onBack={onBack} />;
  }

  if (activeTag) {
    return (
      <div className="vj-grid">
        {filtered.map((entry, i) => (
          <PolaroidCard
            key={entry.id}
            entry={entry}
            index={i}
            onEntryClick={onEntryClick}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="vj-weeks">
      {visibleGroups.map((group) => (
        <WeekSection
          key={group.weekKey}
          label={group.label}
          weekKey={group.weekKey}
          entries={group.entries}
          insight={insightByGroup[group.weekKey]?.insight ?? null}
          insightLoading={Boolean(insightLoadingByGroup[group.weekKey])}
          onEntryClick={onEntryClick}
        />
      ))}
      {visibleGroupCount < groups.length && (
        <div ref={loadMoreRef} className="vj-load-more-sentinel" aria-hidden="true" />
      )}
    </div>
  );
});

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
  const spotifyUrl =
    entry.music_url ??
    `https://open.spotify.com/search/${encodeURIComponent(entry.music)}`;

  return createPortal(
    <div className="vjdetail-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="vjdetail" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="vjdetail__close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="vjdetail__polaroid">
          <div className="vjdetail__photo-stage">
            <img
              src={entry.image_url}
              alt={displayTitle}
              className="vjdetail__img"
              loading="eager"
              fetchPriority="high"
            />
          </div>
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

        {entry.music && entry.music !== '__unvalidated__' && (
        <a
          className="vjdetail__ticket result-music__ticket"
          href={spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${entry.music} on Spotify`}
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
              <span className="result-music__yt">Spotify ↗</span>
            </div>
          </div>
        </a>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function JournalScreen({ nightTexture, musicTexture, onBack }: Props) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<JournalEntry | null>(null);

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

  const allTags = Array.from(new Set(entries.flatMap((e) => e.mood_tags))).sort();

  const filtered = activeTag ? entries.filter((e) => e.mood_tags.includes(activeTag)) : entries;

  const today = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(new Date());

  const handleEntryClick = useCallback((entry: JournalEntry) => {
    setExpandedDetail(entry);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setExpandedDetail(null);
  }, []);

  return (
    <>
      <div className="journal-shell">
        <div className="journal-page journal-page--result journal-page--vj">
          <img className="night-scrap-paper" src={nightTexture} alt="" aria-hidden="true" />
          <img className="music-scrap-paper" src={musicTexture} alt="" aria-hidden="true" />

          <div className="journal-date-header" aria-hidden="true">
            <span className="journal-date-header__dmy">{today}</span>
            <span className="journal-date-header__weekday">{weekday}</span>
          </div>

          <header className="vj-header">
            <h1 className="journal-title vj-title">vibe journal</h1>
            {entries.length > 0 && (
              <p className="vj-subtitle">
                {entries.length} {entries.length === 1 ? 'illustration' : 'illustrations'} · {allTags.length}{' '}
                moods
              </p>
            )}
          </header>

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

          <main className="vj-main">
            <JournalEntryList
              loading={loading}
              error={error}
              filtered={filtered}
              activeTag={activeTag}
              onBack={onBack}
              onEntryClick={handleEntryClick}
            />
          </main>

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

      {expandedDetail && (
        <EntryDetail entry={expandedDetail} onClose={handleCloseDetail} />
      )}
    </>
  );
}
