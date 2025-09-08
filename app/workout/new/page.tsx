// app/workout/new/page.tsx
"use client";
import WorkoutForm from "@/components/forms/WorkoutForm";
import { Dumbbell } from "lucide-react";

export default function Page() {
  return (
    <main className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 p-2 ring-1 ring-white/20">
          <Dumbbell className="size-5" />
        </div>
        <h1 className="text-xl font-semibold">New workout</h1>
      </div>
      <WorkoutForm />
    </main>
  );
}