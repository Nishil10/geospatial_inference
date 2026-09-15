import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
    Home,
    FileText,
    ArrowLeft,
    Plus,
    Search,
    MapPin,
    Loader2,
    RefreshCw,
    X,
} from 'lucide-react';
import clsx from 'clsx';
import Header from '../components/Header';

type Status = 'PENDING' | 'IN REVIEW' | 'RESOLVED';

interface Report {
    _id: string;
    authorName: string;
    title: string;
    body: string;
    location: string;
    tags: string[];
    status: Status;
    createdAt: string;
}

interface FeedMeta {
    total: number;
    resolved: number;
    tags: { tag: string; count: number }[];
}

/** Status drives one hue across the whole record: the spine, the chip, the dot.
 *  Green stays reserved for CHANGE — here, for a case that actually closed. */
const STATUS: Record<Status, { spine: string; text: string; chip: string }> = {
    PENDING: {
        spine: 'bg-brand-warning/70',
        text: 'text-brand-warning',
        chip: 'border-brand-warning/30 bg-brand-warning/10',
    },
    'IN REVIEW': {
        spine: 'bg-brand-info/70',
        text: 'text-brand-info',
        chip: 'border-brand-info/30 bg-brand-info/10',
    },
    RESOLVED: {
        spine: 'bg-brand-accent/70',
        text: 'text-brand-accent',
        chip: 'border-brand-accent/30 bg-brand-accent/10',
    },
};

const SCOPES = [
    { key: 'home' as const, label: 'Home', Icon: Home },
    { key: 'mine' as const, label: 'My Reports', Icon: FileText },
];

/** Mirrors the server's normaliser (server/routes/reports.js) so the chips shown
 *  while composing are the tags that actually get stored. */
const parseTags = (text: string): string[] => {
    const found = text.match(/#[\p{L}\p{N}_]+/gu) ?? [];
    const clean = found
        .map((t) => t.replace(/^#+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30))
        .filter(Boolean);
    return [...new Set(clean)].slice(0, 5);
};

/** A case number, taken from the tail of the Mongo ObjectId. Not invented —
 *  it is the real document id, shortened to something a person can read out. */
const recordOf = (id: string) => id.slice(-6).toUpperCase();

const timeAgo = (iso: string) => {
    const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (secs < 60) return 'just now';
    const units: [number, number, string][] = [
        [3600, 60, 'm'],
        [86400, 3600, 'h'],
        [2592000, 86400, 'd'],
        [31536000, 2592000, 'mo'],
    ];
    for (const [ceiling, divisor, suffix] of units) {
        if (secs < ceiling) return `${Math.floor(secs / divisor)}${suffix} ago`;
    }
    return `${Math.floor(secs / 31536000)}y ago`;
};

export default function CivicFeed() {
    const [scope, setScope] = useState<'home' | 'mine'>('home');
    const [search, setSearch] = useState('');
    const [tagQuery, setTagQuery] = useState('');

    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [meta, setMeta] = useState<FeedMeta | null>(null);

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [location, setLocation] = useState('');
    const [posting, setPosting] = useState(false);
    const [postError, setPostError] = useState<string | null>(null);

    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user') ?? '{}') as { userId?: string; name?: string };
        } catch {
            return {};
        }
    }, []);

    const draftTags = parseTags(body);

    // The search box drives a server-side query, so hold off until typing settles.
    useEffect(() => {
        const t = window.setTimeout(() => setTagQuery(search.trim()), 300);
        return () => window.clearTimeout(t);
    }, [search]);

    const loadReports = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (tagQuery) params.set('tag', tagQuery);
            if (scope === 'mine' && user.userId) params.set('author', user.userId);

            const res = await fetch(`/api/reports?${params.toString()}`);
            if (!res.ok) throw new Error('Request failed');
            setReports(await res.json());
        } catch {
            setError('Could not reach the server.');
            setReports([]);
        } finally {
            setLoading(false);
        }
    }, [tagQuery, scope, user.userId]);

    const loadMeta = useCallback(async () => {
        try {
            const res = await fetch('/api/reports/meta');
            if (res.ok) setMeta(await res.json());
        } catch {
            /* The rail is supplementary — a failure here should not blank the feed. */
        }
    }, []);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    useEffect(() => {
        loadMeta();
    }, [loadMeta]);

    const handlePost = async () => {
        if (!title.trim() || posting) return;
        setPosting(true);
        setPostError(null);
        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    body,
                    location,
                    userId: user.userId,
                    authorName: user.name,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setPostError(data.message || 'Could not save the report.');
                return;
            }
            setTitle('');
            setBody('');
            setLocation('');
            // Clear any active filter so the new post is visible straight away.
            setSearch('');
            setScope('home');
            setReports((prev) => [data as Report, ...prev]);
            loadMeta();
        } catch {
            setPostError('Network error, could not reach server.');
        } finally {
            setPosting(false);
        }
    };

    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex h-screen w-full flex-col bg-dark-900 text-slate-200 selection:bg-brand-accent selection:text-dark-900">
            <Header />

            <div className="flex flex-1 overflow-hidden">
                {/* ---- Left rail ---- */}
                <nav className="hidden w-56 shrink-0 flex-col border-r border-white/[0.07] px-2.5 py-5 lg:flex">
                    <p className="gd-eyebrow px-2.5 pb-2.5">Register</p>
                    <div className="space-y-px">
                        {SCOPES.map(({ key, label, Icon }) => {
                            const active = scope === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setScope(key)}
                                    className={clsx(
                                        'flex w-full items-center gap-2.5 rounded-[2px] px-2.5 py-2 text-left transition-colors',
                                        active ? 'bg-brand-accent/10' : 'hover:bg-white/[0.04]',
                                    )}
                                >
                                    <span
                                        className={clsx(
                                            'h-4 w-[2px] shrink-0 rounded-[1px]',
                                            active ? 'bg-brand-accent' : 'bg-white/10',
                                        )}
                                    />
                                    <Icon
                                        size={14}
                                        strokeWidth={1.75}
                                        className={clsx('shrink-0', active ? 'text-brand-accent' : 'text-slate-400')}
                                    />
                                    <span className={clsx('text-[13px]', active ? 'text-white' : 'text-slate-300')}>
                                        {label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-auto border-t border-white/[0.07] pt-2.5">
                        <Link
                            to="/"
                            className="group flex w-full items-center gap-2.5 rounded-[2px] px-2.5 py-2 transition-colors hover:bg-white/[0.04]"
                        >
                            <span className="h-4 w-[2px] shrink-0 rounded-[1px] bg-white/10 transition-colors group-hover:bg-brand-info" />
                            <ArrowLeft size={14} strokeWidth={1.75} className="shrink-0 text-slate-400 transition-colors group-hover:text-brand-info" />
                            <span className="text-[13px] text-slate-300 transition-colors group-hover:text-white">
                                Back to Maps
                            </span>
                        </Link>
                    </div>
                </nav>

                {/* ---- The log ---- */}
                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-[680px] px-5 py-6">
                        <div className="flex items-baseline justify-between gap-3">
                            <h2 className="text-[19px] font-semibold uppercase tracking-wide text-white">
                                {scope === 'mine' ? 'My Reports' : 'Civic Feed'}
                            </h2>
                            <div className="flex items-center gap-3">
                                <span className="gd-readout text-[11px] text-slate-500">
                                    {reports.length} {reports.length === 1 ? 'record' : 'records'}
                                </span>
                                <button
                                    onClick={loadReports}
                                    title="Refresh"
                                    aria-label="Refresh the log"
                                    className="rounded-[3px] p-1.5 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-white"
                                >
                                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>
                        <div aria-hidden="true" className="gd-rule mt-3" />

                        {/* ---- Composer ---- */}
                        <section className="gd-card mt-5 p-4">
                            <p className="gd-eyebrow">File a report</p>

                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={120}
                                className="mt-3 w-full bg-transparent text-[15px] font-medium text-white outline-none placeholder:font-normal placeholder:text-slate-500"
                                placeholder="What's happening in your neighborhood?"
                            />

                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows={2}
                                maxLength={2000}
                                className="mt-2 w-full resize-none bg-transparent text-[13px] leading-relaxed text-slate-300 outline-none placeholder:text-slate-500"
                                placeholder="Detail — use #tags so others can find it"
                            />

                            <div className="mt-2 flex items-center gap-2 border-t border-white/[0.07] pt-2.5">
                                <MapPin size={13} className="shrink-0 text-brand-info" />
                                <input
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    maxLength={160}
                                    className="w-full bg-transparent font-mono text-[11px] text-slate-300 outline-none placeholder:text-slate-500"
                                    placeholder="Location (optional)"
                                />
                            </div>

                            {draftTags.length > 0 && (
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                    {draftTags.map((t) => (
                                        <span
                                            key={t}
                                            className="rounded-[2px] border border-brand-accent/30 bg-brand-accent/10 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-brand-accent"
                                        >
                                            #{t}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {postError && (
                                <p className="mt-3 border-l-2 border-brand-alert bg-brand-alert/[0.08] px-3 py-2 text-[12px] text-red-300">
                                    {postError}
                                </p>
                            )}

                            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
                                <p className="gd-eyebrow">
                                    {title.trim() ? 'Public register' : 'Title required'}
                                </p>
                                <button
                                    onClick={handlePost}
                                    disabled={!title.trim() || posting}
                                    className="flex items-center gap-2 rounded-[3px] bg-brand-accent px-4 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-label text-dark-900 transition-colors hover:bg-[#34d399] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-accent"
                                >
                                    {posting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={2.5} />}
                                    {posting ? 'Filing' : 'File'}
                                </button>
                            </div>
                        </section>

                        {/* ---- Active filter ---- */}
                        {tagQuery && (
                            <div className="mt-4 flex items-center gap-2">
                                <span className="gd-eyebrow">Filter</span>
                                <button
                                    onClick={() => setSearch('')}
                                    className="flex items-center gap-1.5 rounded-[2px] border border-brand-accent/30 bg-brand-accent/10 px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] text-brand-accent transition-colors hover:bg-brand-accent/20"
                                >
                                    #{tagQuery.replace(/^#+/, '')}
                                    <X size={11} />
                                </button>
                            </div>
                        )}

                        {/* ---- Records ---- */}
                        <div className="mt-4 space-y-3">
                            {loading && reports.length === 0 && (
                                <div className="gd-card flex items-center justify-center gap-2 p-10">
                                    <Loader2 size={14} className="animate-spin text-brand-accent" />
                                    <span className="gd-eyebrow">Reading register</span>
                                </div>
                            )}

                            {error && (
                                <div className="gd-card flex items-center justify-between gap-3 p-4">
                                    <span className="text-[13px] text-red-300">{error}</span>
                                    <button
                                        onClick={loadReports}
                                        className="rounded-[3px] border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-label text-white transition-colors hover:bg-white/[0.06]"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}

                            {!loading && !error && reports.length === 0 && (
                                <div className="gd-card gd-ticks p-10 text-center">
                                    <p className="gd-eyebrow">No records</p>
                                    <p className="mt-2 text-[13px] text-slate-300">
                                        {tagQuery
                                            ? `Nothing tagged #${tagQuery.replace(/^#+/, '')}`
                                            : scope === 'mine'
                                              ? 'You have not filed a report yet'
                                              : 'The register is empty'}
                                    </p>
                                    <p className="mt-1 text-[12px] text-slate-500">
                                        {tagQuery ? 'Try another tag.' : 'File the first one above.'}
                                    </p>
                                </div>
                            )}

                            {reports.map((r) => {
                                const S = STATUS[r.status] ?? STATUS.PENDING;
                                return (
                                    <article key={r._id} className="gd-card group relative overflow-hidden p-4 pl-5">
                                        {/* The spine carries the status, so the chip never has to shout. */}
                                        <span aria-hidden="true" className={clsx('absolute inset-y-0 left-0 w-[2px]', S.spine)} />

                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span className="gd-readout shrink-0 text-[10px] text-slate-600">
                                                    REC {recordOf(r._id)}
                                                </span>
                                                <span
                                                    className={clsx(
                                                        'shrink-0 rounded-[2px] border px-1.5 py-px font-mono text-[9px] font-medium uppercase tracking-label',
                                                        S.chip,
                                                        S.text,
                                                    )}
                                                >
                                                    {r.status}
                                                </span>
                                            </div>
                                            <span className="gd-readout shrink-0 text-[10px] text-slate-500">
                                                {timeAgo(r.createdAt)}
                                            </span>
                                        </div>

                                        <h3 className="mt-2.5 text-[16px] font-medium leading-snug text-white">{r.title}</h3>

                                        {r.location && (
                                            <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">
                                                <MapPin size={11} className="shrink-0 text-brand-info" />
                                                <span className="truncate">{r.location}</span>
                                            </p>
                                        )}

                                        {r.body && (
                                            <p className="mt-2.5 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-300">
                                                {r.body}
                                            </p>
                                        )}

                                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/[0.07] pt-2.5">
                                            <div className="flex flex-wrap gap-1.5">
                                                {r.tags.map((t) => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setSearch(t)}
                                                        className="rounded-[2px] border border-white/[0.07] px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-slate-400 transition-colors hover:border-brand-accent/40 hover:text-brand-accent"
                                                    >
                                                        #{t}
                                                    </button>
                                                ))}
                                            </div>
                                            <span className="gd-readout ml-auto shrink-0 text-[10px] text-slate-500">
                                                {r.authorName}
                                            </span>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </main>

                {/* ---- Right rail ---- */}
                <aside className="hidden w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-white/[0.07] px-4 py-6 xl:flex">
                    <div className="relative">
                        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-[3px] border border-white/[0.07] bg-dark-800 py-2 pl-8 pr-8 font-mono text-[12px] text-white outline-none transition-colors placeholder:text-slate-500 focus:border-brand-accent/50"
                            placeholder="Search #tag…"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                aria-label="Clear the search"
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition-colors hover:text-white"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Counters, straight off /api/reports/meta. */}
                    <section className="gd-card gd-ticks p-4">
                        <p className="gd-eyebrow">Register status</p>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <div>
                                <p className="gd-readout text-[30px] font-medium leading-none text-white">
                                    {meta?.total ?? '—'}
                                </p>
                                <p className="gd-eyebrow mt-1.5">Filed</p>
                            </div>
                            <div>
                                <p className="gd-readout text-[30px] font-medium leading-none text-brand-accent">
                                    {meta?.resolved ?? '—'}
                                </p>
                                <p className="gd-eyebrow mt-1.5">Resolved</p>
                            </div>
                        </div>
                    </section>

                    {/* Tag index — the leaderboard from the same aggregation. */}
                    <section className="gd-card p-4">
                        <p className="gd-eyebrow">Tag index</p>
                        {meta && meta.tags.length > 0 ? (
                            <div className="mt-3 space-y-1.5">
                                {meta.tags.map((t) => (
                                    <button
                                        key={t.tag}
                                        onClick={() => setSearch(t.tag)}
                                        className="group flex w-full items-baseline gap-2 text-left"
                                    >
                                        <span className="shrink-0 font-mono text-[11px] tracking-[0.06em] text-slate-300 transition-colors group-hover:text-brand-accent">
                                            #{t.tag}
                                        </span>
                                        <span aria-hidden="true" className="gd-leader" />
                                        <span className="gd-readout shrink-0 text-[11px] text-slate-500">
                                            {t.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-2.5 text-[12px] text-slate-500">
                                No tags yet — add #tags to a report to open one.
                            </p>
                        )}
                    </section>

                    <div className="mt-auto">
                        <div aria-hidden="true" className="gd-rule" />
                        <p className="gd-eyebrow mt-3 leading-relaxed">
                            Geo Detect · Civic Register
                            <br />
                            <span className="text-slate-600">v1.2 — 2026</span>
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
