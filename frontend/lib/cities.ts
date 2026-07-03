import type { LocationRef } from "./types";

/**
 * Popular starting points shown when a location dropdown is opened before the
 * driver types anything. Coordinates match the backend's bundled dataset so
 * picking one geocodes identically to typing it.
 */
export const POPULAR_CITIES: LocationRef[] = [
  { name: "Chicago, IL", lat: 41.8781, lon: -87.6298 },
  { name: "Los Angeles, CA", lat: 34.0522, lon: -118.2437 },
  { name: "New York, NY", lat: 40.7128, lon: -74.006 },
  { name: "Dallas, TX", lat: 32.7767, lon: -96.797 },
  { name: "Houston, TX", lat: 29.7604, lon: -95.3698 },
  { name: "Atlanta, GA", lat: 33.749, lon: -84.388 },
  { name: "Denver, CO", lat: 39.7392, lon: -104.9903 },
  { name: "Seattle, WA", lat: 47.6062, lon: -122.3321 },
  { name: "Phoenix, AZ", lat: 33.4484, lon: -112.074 },
  { name: "Miami, FL", lat: 25.7617, lon: -80.1918 },
  { name: "Kansas City, MO", lat: 39.0997, lon: -94.5786 },
  { name: "Nashville, TN", lat: 36.1627, lon: -86.7816 },
];
