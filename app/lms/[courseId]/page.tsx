'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FileText, Globe, BookOpen, Clock, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buildLmsGenerationSession, isValidLmsCourseId } from '@/lib/constants/lms-entry';
import { attachParsedPdfToSession } from '@/lib/lms/attach-pdf-to-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('LMS');

interface BuildPreview {
  courseId: string;
  alreadyGenerated: boolean;
  existingCourseTitle: string | null;
  sceneCount: number;
  config: {
    chapterTitle: string;
    language: string;
    languageScript?: string;
    technicalTermsLanguage?: string;
    audience: string;
    durationMinutes: string;
    interactiveMode: boolean;
    webSearch: boolean;
    pdfRequired: boolean;
  };
  requirement: string;
  pdf: {
    resolvedPath: string | null;
    fileName: string | null;
    fileSizeLabel: string | null;
    source: 'course' | 'default' | null;
    expectedCoursePath: string;
    pdfDir: string;
    provider: string;
  };
  generationCacheEnabled: boolean;
}

function pdfSourceLabel(source: BuildPreview['pdf']['source']): string {
  if (source === 'course') return 'Course-specific file';
  if (source === 'default') return 'LMS_PDF_DEFAULT fallback';
  return 'Not found';
}

export default function LmsCourseEntryPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string | undefined;

  const [preview, setPreview] = useState<BuildPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!courseId) {
      setError('Missing course id');
      setLoading(false);
      return;
    }
    if (!isValidLmsCourseId(courseId)) {
      setError('Invalid course id');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/lms/build-preview?courseId=${encodeURIComponent(courseId)}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || json.details || 'Failed to load build preview');
        }
        if (!cancelled) {
          if (json.alreadyGenerated) {
            router.replace(`/course/${courseId}`);
            return;
          }
          setPreview(json as BuildPreview);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load preview');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId, router]);

  const handleConfirm = useCallback(async () => {
    if (!courseId || !preview) return;

    if (preview.config.pdfRequired && !preview.pdf.resolvedPath) {
      setError(`PDF is required but not found. Expected: ${preview.pdf.expectedCoursePath}`);
      return;
    }

    setConfirming(true);
    setError(null);

    try {
      let sessionState = buildLmsGenerationSession(courseId);

      if (preview.pdf.resolvedPath) {
        const pdfRes = await fetch('/api/lms/parse-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId }),
        });

        if (pdfRes.ok) {
          const pdfJson = await pdfRes.json();
          if (pdfJson.success && pdfJson.data) {
            sessionState = await attachParsedPdfToSession(sessionState, pdfJson.data);
            log.info(`Attached LMS PDF for ${courseId}`);
          } else if (preview.config.pdfRequired) {
            throw new Error(pdfJson.message || pdfJson.error || 'PDF parsing failed');
          }
        } else {
          const pdfJson = await pdfRes.json().catch(() => ({}));
          throw new Error(pdfJson.error || pdfJson.details || 'Failed to parse LMS PDF');
        }
      }

      sessionStorage.setItem('generationSession', JSON.stringify(sessionState));
      router.push('/generation-preview');
    } catch (err) {
      log.error('LMS confirm failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to start generation');
      setConfirming(false);
    }
  }, [courseId, preview, router]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <p className="text-muted-foreground text-sm">Loading build preview…</p>
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <p className="text-destructive text-sm text-center max-w-md">{error}</p>
      </div>
    );
  }

  if (!preview) return null;

  const langDisplay = preview.config.languageScript
    ? `${preview.config.language} (${preview.config.languageScript})`
    : preview.config.language;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Confirm course generation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review settings below. Generation runs once; playback later uses{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">/course/{courseId}</code>.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Course</CardTitle>
            <CardDescription>Id: {preview.courseId}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex items-start gap-2">
              <BookOpen className="size-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground">Chapter: </span>
                {preview.config.chapterTitle}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Globe className="size-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground">Language: </span>
                {langDisplay}
                {preview.config.technicalTermsLanguage && (
                  <span className="text-muted-foreground">
                    {' '}
                    · technical terms in {preview.config.technicalTermsLanguage}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users className="size-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground">Audience: </span>
                {preview.config.audience}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="size-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground">Duration: </span>~{preview.config.durationMinutes}{' '}
                minutes
              </div>
            </div>
            <div className="text-muted-foreground">
              Interactive mode: {preview.config.interactiveMode ? 'On' : 'Off'} · Web search: Off
              {preview.generationCacheEnabled && ' · Generation cache: On'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="size-4" />
              Source PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {preview.pdf.resolvedPath ? (
              <>
                <p>
                  <span className="text-muted-foreground">File: </span>
                  <code className="text-xs break-all">{preview.pdf.resolvedPath}</code>
                </p>
                <p className="text-muted-foreground">
                  {pdfSourceLabel(preview.pdf.source)}
                  {preview.pdf.fileSizeLabel && ` · ${preview.pdf.fileSizeLabel}`}
                  {` · parser: ${preview.pdf.provider}`}
                </p>
              </>
            ) : (
              <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                <div>
                  <p>No PDF found.</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Expected: <code>{preview.pdf.expectedCoursePath}</code>
                    {preview.config.pdfRequired && ' (required — set LMS_PDF_REQUIRED=false to skip)'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Generation prompt</CardTitle>
            <CardDescription>This exact text will be sent to the model.</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              readOnly
              value={preview.requirement}
              className="w-full min-h-[280px] text-xs font-mono leading-relaxed p-3 rounded-md border bg-muted/30 resize-y"
            />
          </CardContent>
        </Card>

        {error && (
          <p className="text-destructive text-sm text-center">{error}</p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={confirming}
            onClick={() => router.push('/')}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={confirming || (preview.config.pdfRequired && !preview.pdf.resolvedPath)}
            onClick={handleConfirm}
          >
            {confirming ? 'Starting…' : 'Confirm & generate'}
          </Button>
        </div>
      </div>
    </div>
  );
}
