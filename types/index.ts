export interface SetEntry {
  id: string;
  reps: number;
  weight: number;
}

export interface ExerciseEntry {
  id: string;
  name: string;
  sets: SetEntry[];
}

export interface Workout {
  id: string;
  user_id: string;
  created_at: string;
  name: string;
  day: string;
  sets: SetEntry[];
  volume: number;
}

export interface Mood {
  id: string;
  user_id: string;
  created_at: string;
  score: number;
  journal: string | null;
  sentiment: {
    label: string;
    score: number;
  } | null;
  post_workout: boolean;
}