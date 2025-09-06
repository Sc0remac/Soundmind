import dynamic from "next/dynamic";

const TimelineFeed = dynamic(() => import("@/components/TimelineFeed"), {
  ssr: false,
});

export default function TimelinePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Timeline</h1>
      <p className="text-sm text-gray-600">
        Your moods and workouts, grouped by day. Click into a workout to review your sets.
      </p>
      <TimelineFeed />
    </div>
  );
}
