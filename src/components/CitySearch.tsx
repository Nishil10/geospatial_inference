import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';

export interface CityResult {
  id: string;
  name: string;
  label: string;
  lat: number;
  lon: number;
}

interface CitySearchProps {
  onSelect: (city: CityResult) => void;
}

export default function CitySearch({ onSelect }: CitySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Nominatim asks callers not to hammer it, so wait for a pause in typing.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const response = await fetch(`/api/city/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const body = await response.json().catch(() => null);
        if (!controller.signal.aborted) {
          setResults(body?.results ?? []);
          setActive(0);
        }
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const choose = useCallback(
    (city: CityResult) => {
      onSelect(city);
      setOpen(false);
      setQuery('');
      setResults([]);
    },
    [onSelect]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
          size={13}
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Locate a city…"
          aria-label="Search for a city"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="city-search-results"
          className="w-40 rounded-[3px] border border-white/[0.07] bg-dark-800 py-1.5 pl-8 pr-8 text-[13px] text-white outline-none transition-colors placeholder:text-slate-500 focus:border-brand-accent/60 lg:w-52"
        />
        {loading && (
          <Loader2
            size={13}
            aria-hidden="true"
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
          />
        )}
      </div>

      {open && (query.trim().length >= 2) && (
        <div
          id="city-search-results"
          role="listbox"
          className="gd-card gd-slip absolute right-0 top-full z-[1050] mt-2 w-72 overflow-hidden"
        >
          {results.length > 0 ? (
            <ul className="max-h-72 overflow-y-auto p-1.5">
              {results.map((city, i) => (
                <li key={city.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(city)}
                    className={`flex w-full items-start gap-2.5 rounded-[2px] px-2.5 py-2 text-left transition-colors ${
                      i === active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <MapPin
                      size={13}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-brand-accent"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-white">{city.name}</span>
                      <span className="gd-readout block truncate text-[10px] text-slate-500">{city.label}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-5 text-center text-[13px] text-slate-500">
              {loading ? 'Searching…' : 'No match'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
