import { Bone } from '@/components/states';

export function EditorSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <Bone className="mb-5 h-5 w-40" />
      <div className="space-y-4">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <Bone className="h-5 w-32" />
            <Bone className="h-10 w-full max-w-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageBodySkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Bone className="h-10 w-full rounded-lg sm:w-80" />
      <Bone className="h-32 rounded-xl" />
      <EditorSkeleton />
    </div>
  );
}
