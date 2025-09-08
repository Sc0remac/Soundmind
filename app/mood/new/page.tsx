// app/mood/new/page.tsx
"use client";
import MoodForm from "@/components/forms/MoodForm";
import { Brain } from "lucide-react";

export default function Page() {
  return (
    <main className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 p-2 ring-1 ring-white/20">
          <Brain className="size-5" />
        </div>
        <h1 className="text-xl font-semibold">New mood entry</h1>
      </div>
      <MoodForm />
    </main>
  );
}