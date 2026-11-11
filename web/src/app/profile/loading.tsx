import { LoadingState } from "@/components/ui/States";

export default function ProfileLoading() {
  return (
    <div className="px-4 py-6 sm:px-5">
      <p className="text-sm font-semibold text-primary">
        Loading your profile…
      </p>
      <div className="mt-4">
        <LoadingState label="Loading your SYNERGY profile" />
      </div>
    </div>
  );
}
