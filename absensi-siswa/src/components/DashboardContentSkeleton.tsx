export default function DashboardContentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Memuat halaman">
      <div className="clay-card h-32 p-6"><div className="h-5 w-36 rounded-full bg-slate-100" /><div className="mt-6 h-9 w-24 rounded-full bg-slate-100" /></div>
      <div className="clay-card h-32 p-6"><div className="h-5 w-28 rounded-full bg-slate-100" /><div className="mt-6 h-9 w-20 rounded-full bg-slate-100" /></div>
      <div className="clay-card h-96 p-6"><div className="h-5 w-56 rounded-full bg-slate-100" /><div className="mt-7 h-64 rounded-2xl bg-slate-100" /></div>
      <div className="clay-card h-32 p-6"><div className="h-5 w-28 rounded-full bg-slate-100" /><div className="mt-6 h-9 w-20 rounded-full bg-slate-100" /></div>
    </div>
  );
}
