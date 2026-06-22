'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SelfServiceAnswerPanelProps {
  answer?: string;
  confidence?: number;
  onSolved: () => void;
  onContinue: () => void;
}

export function SelfServiceAnswerPanel({
  answer,
  confidence,
  onSolved,
  onContinue,
}: SelfServiceAnswerPanelProps) {
  if (!answer || !confidence || confidence <= 0.8) {
    return null;
  }

  return (
    <Card className="mt-3 border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <p className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">
          We think this answers your question
        </p>
        <p className="text-sm text-blue-900 mb-4 leading-relaxed">{answer}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            onClick={onSolved}
          >
            This solved it — I don&apos;t need to submit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
            onClick={onContinue}
          >
            My issue is different — continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
