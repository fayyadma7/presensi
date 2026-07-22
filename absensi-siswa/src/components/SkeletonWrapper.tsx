"use client";

interface SkeletonWrapperProps {
  loading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}

export default function SkeletonWrapper({ loading, skeleton, children }: SkeletonWrapperProps) {
  if (loading) return <>{skeleton}</>;

  return <>{children}</>;
}
