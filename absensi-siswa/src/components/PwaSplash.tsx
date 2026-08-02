export default function PwaSplash() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="login-bg fixed inset-0 pointer-events-none" />

      {/* Konten tengah */}
      <div className="relative flex-1 flex flex-col items-center justify-center gap-5 px-6">
        <div className="relative">
          <img
            src="/icons/icon-512.png"
            alt="Presensi SMK Muhammadiyah 3 Purbalingga"
            width={96}
            height={96}
            className="w-24 h-24 rounded-3xl shadow-[0_12px_32px_rgba(79,70,229,0.35)]"
          />
          <div className="absolute -inset-2 rounded-[28px] bg-[#4F46E5]/10 animate-pulse -z-10" />
        </div>
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold text-[#4F46E5] leading-tight">Presensi</h1>
          <p className="font-heading text-lg font-semibold text-foreground/70 mt-0.5 leading-tight">SMK Muhammadiyah 3 Purbalingga</p>
          <p className="font-body text-sm text-muted-foreground mt-2">Memuat…</p>
        </div>
        <div className="w-28 h-1.5 rounded-full bg-[#4F46E5]/15 overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-[#4F46E5] animate-[loader_1s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* Hak cipta */}
      <div className="relative pb-6 text-center">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()}{" "}
          <span className="font-bold">Fayyad Malik Abdillah</span>. All rights reserved.
        </p>
      </div>
    </div>
  );
}
