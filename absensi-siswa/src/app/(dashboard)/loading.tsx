import DashboardContentSkeleton from "@/components/DashboardContentSkeleton";

export default function DashboardLoading() {
  return (
    <main className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-6 w-full">
      <DashboardContentSkeleton />
    </main>
  );
}
