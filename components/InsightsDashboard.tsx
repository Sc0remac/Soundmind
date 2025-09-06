"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { computeVolume, pearsonCorrelation } from '@/lib/utils';
import { Scatter } from 'react-chartjs-2';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

export default function InsightsDashboard() {
  const [volumeMoodCorrelation, setVolumeMoodCorrelation] = useState<number | null>(null);
  const [volumeMoodData, setVolumeMoodData] = useState<{ x: number; y: number }[]>([]);
  const [moodByDay, setMoodByDay] = useState<{ day: string; average: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // fetch workouts and moods
      const [workoutRes, moodRes] = await Promise.all([
        supabase.from('workouts').select('*'),
        supabase.from('moods').select('*'),
      ]);
      const workouts = workoutRes.data || [];
      const moods = moodRes.data || [];

      // compute volume vs mood pairs
      const pairs: { x: number; y: number }[] = [];
      // naive: pair each mood entry with the volume of the most recent workout before it
      // sort workouts by created_at
      const sortedWorkouts = [...workouts].sort(
        (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      for (const mood of moods) {
        // find the latest workout before this mood
        const workout = sortedWorkouts
          .filter((w: any) => new Date(w.created_at) <= new Date(mood.created_at))
          .pop();
        if (workout) {
          const volume = workout.volume ?? computeVolume(workout.sets || []);
          pairs.push({ x: volume, y: mood.score });
        }
      }
      // compute correlation
      if (pairs.length >= 2) {
        const x = pairs.map((p) => p.x);
        const y = pairs.map((p) => p.y);
        setVolumeMoodCorrelation(pearsonCorrelation(x, y));
      } else {
        setVolumeMoodCorrelation(null);
      }
      setVolumeMoodData(pairs);

      // compute average mood by day of week
      const moodsByDay: Record<string, number[]> = {};
      moods.forEach((m: any) => {
        const date = new Date(m.created_at);
        const day = date.toLocaleString('en-US', { weekday: 'long' });
        if (!moodsByDay[day]) moodsByDay[day] = [];
        moodsByDay[day].push(m.score);
      });
      const dayAvgs: { day: string; average: number }[] = Object.entries(moodsByDay).map(
        ([day, scores]) => ({ day, average: scores.reduce((a, b) => a + b, 0) / scores.length }),
      );
      // ensure consistent order Monday-Sunday
      const order = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ];
      dayAvgs.sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
      setMoodByDay(dayAvgs);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <p>Loading insights…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Volume vs Mood</h2>
        {volumeMoodData.length < 2 ? (
          <p className="text-sm">Not enough data to compute correlation yet.</p>
        ) : (
          <div>
            {volumeMoodCorrelation !== null && (
              <p className="text-sm mb-2">
                Pearson correlation: {volumeMoodCorrelation.toFixed(2)}
              </p>
            )}
            <Scatter
              data={{
                datasets: [
                  {
                    label: 'Volume vs Mood',
                    data: volumeMoodData,
                    pointBackgroundColor: '#2563eb',
                  },
                ],
              }}
              options={{
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: 'Workout Volume',
                    },
                  },
                  y: {
                    title: {
                      display: true,
                      text: 'Mood Score',
                    },
                    min: 0,
                    max: 10,
                  },
                },
              }}
            />
          </div>
        )}
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Average Mood by Day of Week</h2>
        {moodByDay.length === 0 ? (
          <p className="text-sm">No mood data available.</p>
        ) : (
          <Bar
            data={{
              labels: moodByDay.map((d) => d.day),
              datasets: [
                {
                  label: 'Average Mood',
                  data: moodByDay.map((d) => d.average),
                  backgroundColor: '#2563eb',
                },
              ],
            }}
            options={{
              scales: {
                y: {
                  min: 0,
                  max: 10,
                  title: {
                    display: true,
                    text: 'Mood Score',
                  },
                },
                x: {
                  title: {
                    display: true,
                    text: 'Day of Week',
                  },
                },
              },
            }}
          />
        )}
      </div>
    </div>
  );
}