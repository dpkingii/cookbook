import { PageSkeleton } from "@/components/site/PageSkeleton";

export default function Loading() {
  return <PageSkeleton tone="mint" label="Loading your profile" rows={4} />;
}
