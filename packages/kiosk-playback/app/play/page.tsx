'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { KioskClassroomView } from '@/components/kiosk/kiosk-classroom-view';

function PlayPageContent() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId')?.trim();

  if (!courseId) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
        <div className="text-center text-muted-foreground max-w-md">
          <p className="font-medium text-foreground mb-2">OpenMAIC playback shell</p>
          <p className="text-sm">
            Add a course id:{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">/play?courseId=your-course-id</code>
          </p>
        </div>
      </div>
    );
  }

  return <KioskClassroomView courseId={courseId} />;
}

export default function KioskPlayPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[100dvh] flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <PlayPageContent />
    </Suspense>
  );
}
