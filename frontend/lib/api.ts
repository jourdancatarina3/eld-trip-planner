import type { LocationRef, TripPlan, TripRequest } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(response: Response): Promise<never> {
  let message = "Something went wrong. Please try again.";
  try {
    const body = await response.json();
    if (typeof body?.error === "string") message = body.error;
  } catch {
    // non-JSON error body; keep the generic message
  }
  throw new ApiError(message, response.status);
}

export async function geocode(query: string): Promise<LocationRef[]> {
  const response = await fetch(
    `${API_BASE}/api/geocode/?q=${encodeURIComponent(query)}`
  );
  if (!response.ok) return [];
  return response.json();
}

export async function planTrip(request: TripRequest): Promise<TripPlan> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/trips/plan/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new ApiError(
      "Could not reach the planning service. Is the backend running?"
    );
  }
  if (!response.ok) await parseError(response);
  return response.json();
}
