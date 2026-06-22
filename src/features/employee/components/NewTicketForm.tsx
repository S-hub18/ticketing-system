'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatTicketId } from '@/lib/ticket-helpers';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { UrgencyNudge } from './UrgencyNudge';
import { SelfServiceAnswerPanel } from './SelfServiceAnswerPanel';
import { DuplicateWarningSheet } from './DuplicateWarningSheet';

const URGENCY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
] as const;

const DEPARTMENTS = ['IT', 'HR', 'FINANCE', 'ADMIN'] as const;

const DEPT_KEYWORDS: Record<string, string[]> = {
  IT: ['vpn','laptop','computer','pc','wifi','wi-fi','network','email','outlook','teams','slack','software','password','login','access','printer','internet','system','server','app','application','tool','device','screen','monitor','keyboard','mouse','phone','account','locked','crash','slow','broken','update','install','error','bug','code','remote','desktop','drive','storage','backup','zoom','meeting','browser','chrome','windows','mac','office','excel','word','powerpoint'],
  HR: ['salary','payroll','leave','holiday','vacation','sick','pto','onboarding','offboarding','contract','policy','benefit','insurance','health','pension','appraisal','performance','review','team','manager','harassment','resign','resignation','hire','hiring','job','role','promotion','complaint','grievance','hr','human resources','training','induction'],
  FINANCE: ['expense','reimbursement','reimburse','invoice','budget','payment','receipt','purchase','approval','purchase order','po','vendor','supplier','tax','billing','cost','spend','refund','claim','finance','accounting','accounts','invoice','credit card','card','travel','trip','subsistence'],
  ADMIN: ['desk','chair','office','parking','visitor','badge','facilities','supply','supplies','room','booking','maintenance','cleaning','ac','heating','air','temperature','noise','light','building','floor','toilet','kitchen','canteen','food','drink','locker','delivery','post','mail','stationery','printer paper'],
};

function detectDeptFromText(text: string): { dept: string; confidence: number } | null {
  const lower = text.toLowerCase();
  const scores: Record<string, number> = { IT: 0, HR: 0, FINANCE: 0, ADMIN: 0 };
  for (const [dept, keywords] of Object.entries(DEPT_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) scores[dept] += kw.includes(' ') ? 2 : 1;
    }
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (best[1] === 0) return null;
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  return { dept: best[0], confidence: Math.min(0.95, best[1] / total + 0.3) };
}

const DEPT_STYLES: Record<string, string> = {
  IT:      'bg-blue-600 text-white border-blue-600',
  HR:      'bg-purple-600 text-white border-purple-600',
  FINANCE: 'bg-green-600 text-white border-green-600',
  ADMIN:   'bg-amber-500 text-white border-amber-500',
};

export function NewTicketForm() {
  const router = useRouter();

  const [text, setText] = useState('');
  const [manualDept, setManualDept] = useState<string | null>(null);
  const [aiDept, setAiDept] = useState<{ dept: string; confidence: number } | null>(null);
  const [urgency, setUrgency] = useState('MEDIUM');
  const [urgencyNudgeDismissed, setUrgencyNudgeDismissed] = useState(false);
  const [selfServiceDismissed, setSelfServiceDismissed] = useState(false);
  const [aiIntakeResult, setAiIntakeResult] = useState<any>(null);
  const [duplicateSheetOpen, setDuplicateSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Instant keyword detection — no API needed
  useEffect(() => {
    if (!manualDept) {
      const detected = text.trim().length >= 5 ? detectDeptFromText(text) : null;
      setAiDept(detected);
    }
  }, [text, manualDept]);

  // Gemini API call for richer results — fires 400ms after typing stops, once the
  // description is substantial enough to analyse (matches the intake spec: length > 50).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length <= 50) { setAiIntakeResult(null); return; }

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      try {
        const res = await fetch('/api/ai/intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: text }),
          signal: abortRef.current.signal,
        });
        if (!res.ok) return; // silently skip if AI unavailable
        const data = await res.json();
        if (data.department && !manualDept) {
          setAiDept({ dept: data.department, confidence: data.confidence ?? 0.8 });
          setAiIntakeResult(data);
        }
      } catch {
        // silent — keyword fallback already handles it
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [text, manualDept]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [text]);

  const resolvedDept = manualDept ?? aiDept?.dept ?? null;

  // Derive title from first line, description from full text
  const firstLine = text.split('\n')[0].trim().slice(0, 120);
  const title = firstLine || text.trim().slice(0, 120);

  function validate() {
    const errs: Record<string, string> = {};
    if (!text.trim()) errs.text = 'Please describe your issue.';
    if (!resolvedDept) errs.dept = 'Pick a department or type more so we can route it.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function doSubmit(duplicateShown: boolean) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: text.trim(),
          department: resolvedDept,
          urgency,
          aiCategory: aiIntakeResult?.department ?? aiDept?.dept ?? null,
          aiCategoryConf: aiDept?.confidence ?? null,
          duplicateShown,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Error ${res.status}`);
      const ticket = await res.json();
      toast.success(`Ticket ${formatTicketId(ticket.id)} created`, {
        description: 'We’ve routed it to the right team.',
      });
      router.push(`/tickets/${ticket.id}`);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const hasSimilar = aiIntakeResult?.similarTickets?.length > 0;
    if (hasSimilar) setDuplicateSheetOpen(true);
    else doSubmit(false);
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6 space-y-5">

            {/* Single text field */}
            <div className="space-y-1.5">
              <Label htmlFor="issue">What&apos;s the issue?</Label>
              <Textarea
                ref={textareaRef}
                id="issue"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. VPN not working, can't login, expense not approved…"
                rows={3}
                className={`resize-none overflow-hidden text-base ${errors.text ? 'border-red-400' : ''}`}
                autoFocus
              />
              {errors.text && <p className="text-xs text-red-500">{errors.text}</p>}
            </div>

            {/* Department */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  Route to
                  <span className="text-muted-foreground text-xs font-normal ml-1">
                    — auto-detected as you type
                  </span>
                </Label>
                {manualDept && (
                  <button type="button" onClick={() => setManualDept(null)}
                    className="text-xs text-muted-foreground hover:text-foreground underline">
                    Auto-detect
                  </button>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                {DEPARTMENTS.map((dept) => {
                  const isActive = resolvedDept === dept;
                  const isAi = !manualDept && aiDept?.dept === dept;
                  return (
                    <button key={dept} type="button"
                      onClick={() => setManualDept(manualDept === dept ? null : dept)}
                      className={`relative px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        isActive ? DEPT_STYLES[dept] : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                      }`}>
                      {dept}
                      {isAi && (
                        <span className="absolute -top-1.5 -right-1 text-[9px] bg-blue-100 text-blue-700 rounded-full px-1 leading-tight font-semibold">
                          AI
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {errors.dept && !resolvedDept && (
                <p className="text-xs text-amber-600">{errors.dept}</p>
              )}

              {/* Urgency nudge from AI */}
              {!urgencyNudgeDismissed && aiIntakeResult?.urgencySuggestion && (
                <UrgencyNudge
                  urgencySuggestion={aiIntakeResult.urgencySuggestion}
                  signals={aiIntakeResult.urgencySignals}
                  onAccept={() => { setUrgency(aiIntakeResult.urgencySuggestion); setUrgencyNudgeDismissed(true); }}
                  onDismiss={() => setUrgencyNudgeDismissed(true)}
                />
              )}

              {/* Self-service answer from AI */}
              {!selfServiceDismissed && aiIntakeResult?.selfServiceAnswer && (
                <SelfServiceAnswerPanel
                  answer={aiIntakeResult.selfServiceAnswer}
                  confidence={aiIntakeResult.selfServiceConfidence}
                  onSolved={() => {
                    toast.success('Glad we could help!');
                    router.push('/dashboard');
                  }}
                  onContinue={() => setSelfServiceDismissed(true)}
                />
              )}
            </div>

            {/* Urgency */}
            <div className="space-y-1.5">
              <Label>Urgency</Label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                {URGENCY_OPTIONS.map((opt, i) => (
                  <button key={opt.value} type="button" onClick={() => setUrgency(opt.value)}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${i > 0 ? 'border-l border-border' : ''} ${
                      urgency === opt.value
                        ? opt.value === 'LOW' ? 'bg-gray-600 text-white'
                          : opt.value === 'MEDIUM' ? 'bg-blue-600 text-white'
                          : opt.value === 'HIGH' ? 'bg-orange-500 text-white'
                          : 'bg-red-600 text-white'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {urgency === 'CRITICAL' && (
                <p className="text-xs text-red-600">⚠️ This will immediately notify all department agents</p>
              )}
            </div>

            {submitError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">{submitError}</p>
            )}

            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={submitting} className="min-w-32">
                {submitting ? 'Submitting…' : 'Submit Ticket'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <DuplicateWarningSheet
        tickets={(aiIntakeResult?.similarTickets ?? []).map((t: any) => ({
          id: t.id, title: t.title, status: t.status,
          resolutionSummary: t.resolutionSummary, createdAt: '',
        }))}
        open={duplicateSheetOpen}
        onOpenChange={setDuplicateSheetOpen}
        onSubmitAnyway={() => { setDuplicateSheetOpen(false); doSubmit(true); }}
        onCancel={() => setDuplicateSheetOpen(false)}
      />
    </>
  );
}
