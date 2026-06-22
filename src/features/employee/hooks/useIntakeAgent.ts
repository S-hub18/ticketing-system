'use client';

import { useState, useEffect, useRef } from 'react';

export interface SimilarTicket {
  id: string;
  title: string;
  status: string;
  resolutionSummary?: string | null;
  createdAt: string;
}

export interface IntakeResult {
  department: string;
  confidence: number;
  urgencySuggestion?: string;
  urgencySignals?: string[];
  selfServiceAnswer?: string;
  selfServiceConfidence?: number;
  similarTickets: SimilarTicket[];
}

export function useIntakeAgent(description: string, title?: string) {
  const [intakeResult, setIntakeResult] = useState<IntakeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Use title + description combined — fire as soon as there's anything meaningful
  const combined = [title, description].filter(Boolean).join(' ').trim();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (combined.length < 10) {
      setIntakeResult(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const res = await fetch('/api/ai/intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: combined, title }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error(`${res.status}`);
        setIntakeResult(await res.json());
        setError(null);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'error');
        setIntakeResult(null);
      } finally {
        setIsLoading(false);
      }
    }, 600);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [combined]);

  return { intakeResult, isLoading, error };
}
