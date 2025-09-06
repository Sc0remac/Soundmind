import dynamic from "next/dynamic";

const MoodForm = dynamic(() => import("@/components/MoodForm"), { ssr: false });

export default function LogMoodPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Log Mood</h1>
      <MoodForm />
    </div>
  );
}
