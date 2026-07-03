"use client";

import { useEffect, useId, useRef, useState } from "react";
import { geocode } from "@/lib/api";
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
  const [suggestions, setSuggestions] = useState<LocationRef[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextSearch = useRef(false);
  const listboxId = useId();

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const query = value.trim();
    if (query.length < 2 || selected) {
      setSuggestions([]);
      setOpen(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await geocode(query);
        setSuggestions(results);
        setOpen(results.length > 0);
        setActiveIndex(results.length > 0 ? 0 : -1);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [value, selected]);

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
    setSuggestions([]);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (index) => (index - 1 + suggestions.length) % suggestions.length
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0) pick(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

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
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-9 text-[15px] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 ${
            error ? "border-rose-400" : "border-slate-300"
          }`}
        />
        {searching && (
          <span
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500"
            aria-hidden
          />
        )}
        {!searching && selected && (
          <svg
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.79 6.8-6.8a1 1 0 0 1 1.4 0Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
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
  );
}
