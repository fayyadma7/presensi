export default function RootLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-[#EEF2FF] via-[#F5F3FF] to-[#EEF2FF]">
      <div className="h-20 w-20 rounded-3xl bg-[#4F46E5] shadow-[0_8px_20px_rgba(79,70,229,0.35)] flex items-center justify-center animate-pulse">
        <span className="text-4xl text-white font-bold font-[var(--font-heading)]">P</span>
      </div>
      <div className="text-center">
        <p className="font-[var(--font-heading)] text-xl font-bold text-[#4F46E5]">
          Presensi SMK Muhammadiyah 3 Purbalingga
        </p>
        <p className="font-[var(--font-body)] text-sm text-muted-foreground mt-1">Memuat…</p>
      </div>
      <div className="w-24 h-1.5 rounded-full bg-[#4F46E5]/20 overflow-hidden">
        <div className="h-full w-1/2 rounded-full bg-[#4F46E5] animate-[loader_1s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}
