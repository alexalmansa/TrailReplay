export function AppLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--canvas)]">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-2xl border border-[var(--evergreen)]/10 bg-white p-4 shadow-lg">
          <img
            src="/media/images/simplelogo.png"
            alt="TrailReplay"
            className="h-12 w-12 object-contain"
          />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold tracking-[0.08em] text-[var(--evergreen)]">
            TrailReplay
          </p>
          <div className="mx-auto h-6 w-6 rounded-full border-2 border-[var(--trail-orange)] border-t-transparent animate-spin" />
        </div>
      </div>
    </div>
  );
}
