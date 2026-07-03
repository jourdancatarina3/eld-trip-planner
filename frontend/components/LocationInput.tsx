"use client";

import { useEffect, useId, useRef, useState } from "react";
import { geocode } from "@/lib/api";
import { POPULAR_CITIES } from "@/lib/cities";
import type { LocationRef } from "@/lib/types";

interface Props {
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  value: string;
  selected: LocationRef | null;
  onChange: (text: string, selected: LocationRef | null) => void;
  error?: string;
  testId: string;
}

export default function LocationInput({
  label,
  placeholder,
  icon,
  value,
  selected,
  onChange,
  error,
  testId,
}: Props) {
  const [suggestions, setSuggestions] = useState<LocationRef[]>(POPULAR_CITIES);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipNextSearch = useRef(false);
  const listboxId = useId();

  // "Search mode" = the driver has typed a query and hasn't picked a result;
  // otherwise the dropdown shows the popular-cities shortlist.
  const query = value.trim();
  const inSearchMode = !selected && query.length >= 2;

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    if (selected || query.length < 2) {
      setSuggestions(POPULAR_CITIES);
      setSearching(false);
      setActiveIndex(-1);
      return;
    }
    // Clear the popular list immediately so a stale option can't be clicked
    // while the geocode request is in flight.
    setSuggestions([]);
    setSearching(true);
    setActiveIndex(-1);
    const timer = setTimeout(async () => {
      try {
        const results = await geocode(query);
        setSuggestions(results);
        setActiveIndex(results.length > 0 ? 0 : -1);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, selected]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(suggestion: LocationRef) {
    skipNextSearch.current = true;
    onChange(suggestion.name, suggestion);
    setOpen(false);
  }

  function toggleOpen() {
    if (open) {
      setOpen(false);
    } else {
      setOpen(true);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (suggestions.length > 0) {
        setActiveIndex((index) => (index + 1) % suggestions.length);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (open && suggestions.length > 0) {
        setActiveIndex(
          (index) => (index - 1 + suggestions.length) % suggestions.length
        );
      }
    } else if (event.key === "Enter") {
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        event.preventDefault();
        pick(suggestions[activeIndex]);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showEmptyMessage =
    open && inSearchMode && !searching && suggestions.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          data-testid={testId}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value, null)}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          className={`w-full cursor-pointer rounded-lg border bg-white py-2.5 pl-10 pr-10 text-[15px] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 ${
            error ? "border-rose-400" : "border-slate-300"
          }`}
        />
        {searching ? (
          <span
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500"
            aria-hidden
          />
        ) : (
          <button
            type="button"
            tabIndex={-1}
            aria-label={open ? "Close city list" : "Open city list"}
            data-testid={`${testId}-toggle`}
            onClick={toggleOpen}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:text-slate-600"
          >
            <svg
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {(open && suggestions.length > 0) || showEmptyMessage ? (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {!inSearchMode && (
            <p className="border-b border-slate-100 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Popular cities
            </p>
          )}
          {showEmptyMessage ? (
            <p className="px-3 py-3 text-sm text-slate-500">
              No matches for &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <ul
              id={listboxId}
              role="listbox"
              className="max-h-60 overflow-auto py-1"
            >
              {suggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion.name}-${suggestion.lat}-${suggestion.lon}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  data-testid={`${testId}-option`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pick(suggestion);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm ${
                    index === activeIndex
                      ? "bg-amber-50 text-slate-900"
                      : "text-slate-700"
                  }`}
                >
                  <svg
                    className="h-3.5 w-3.5 shrink-0 text-slate-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M9.7 17.7a.75.75 0 0 0 .6 0c.1 0 .2-.1.3-.2a26 26 0 0 0 2.3-2 15 15 0 0 0 2-2.4c.8-1.2 1.6-2.8 1.6-4.6a6.5 6.5 0 1 0-13 0c0 1.8.8 3.4 1.6 4.6a15 15 0 0 0 4.3 4.4l.3.2ZM10 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {suggestion.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
