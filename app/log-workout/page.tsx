import dynamic from 'next/dynamic';

// Dynamically import the client component to avoid SSR issues.
const WorkoutForm = dynamic(() => import('@/components/WorkoutForm'), {
  ssr: false,
});

export default function LogWorkoutPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Log Workout</h1>
      <WorkoutForm />
    </div>
  );
}