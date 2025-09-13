import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

function loadEnvLocal() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local')
    if (!fs.existsSync(envPath)) return
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
    for (const raw of lines) {
      const line = raw.trim(); if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('='); if (eq === -1) continue
      const key = line.slice(0, eq).trim()
      let val = line.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
      if (!(key in process.env)) (process.env as any)[key] = val
    }
  } catch {}
}

loadEnvLocal()

function getEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return { url, key }
}

const providedUserId = '4b09be62-6ee4-4b1f-9c90-58bc4193c725'
const providedEmail = 'cormackerr@hotmail.com'

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)] }

const SPLITS = [
  { key: 'Push', exercises: [
    { name: 'Bench Press', base: 75 },
    { name: 'Incline DB Press', base: 28 },
    { name: 'Shoulder Press', base: 45 },
    { name: 'Triceps Pushdown', base: 25 },
  ]},
  { key: 'Pull', exercises: [
    { name: 'Deadlift', base: 120 },
    { name: 'Barbell Row', base: 60 },
    { name: 'Lat Pulldown', base: 55 },
    { name: 'Face Pull', base: 20 },
  ]},
  { key: 'Legs', exercises: [
    { name: 'Back Squat', base: 100 },
    { name: 'Romanian Deadlift', base: 80 },
    { name: 'Leg Press', base: 160 },
    { name: 'Leg Curl', base: 40 },
  ]},
  { key: 'Upper', exercises: [
    { name: 'Bench Press', base: 75 },
    { name: 'Pull-ups', base: 0 },
    { name: 'Overhead Press', base: 45 },
    { name: 'Cable Row', base: 50 },
  ]},
  { key: 'Cardio', exercises: [
    { name: 'Treadmill Run', base: 0 },
    { name: 'Assault Bike', base: 0 },
  ]}
]

const MOOD_TAGS = ['Calm','Focused','Optimistic','Energised','Drained','Stressed','Anxious']

type Block = { exercise_name: string, sets: { reps: number, weight_kg: number }[] }

function planWorkout(splitKey: string): Block[] {
  const split = SPLITS.find(s => s.key === splitKey) || pick(SPLITS)
  const chosen = split.exercises.slice(0, rand(2, Math.min(4, split.exercises.length)))
  return chosen.map(ex => ({
    exercise_name: ex.name,
    sets: Array.from({ length: rand(3, 5) }, () => ({
      reps: rand(5, 12),
      weight_kg: ex.base ? ex.base + rand(-8, 8) : 0,
    }))
  }))
}

function blocksVolume(blocks: Block[]) {
  return blocks.reduce((tot, b) => tot + b.sets.reduce((s, st) => s + st.reps * (st.weight_kg || 0), 0), 0)
}

async function main() {
  const { url, key } = getEnv()
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  // Resolve user id
  let userId = providedUserId
  try {
    if (!userId) {
      const { data, error } = await (supabase as any).auth.admin.listUsers()
      if (error) throw error
      const user = data.users.find((u: any) => (u.email || '').toLowerCase() === providedEmail.toLowerCase())
      if (!user) throw new Error('User not found by email')
      userId = user.id
    }
  } catch (e) {
    // fallback to provided id
  }

  const today = new Date()
  today.setHours(12,0,0,0)
  const start = new Date(today)
  start.setDate(start.getDate() - 90)

  const workoutTargets: { date: Date, time: string, split: string }[] = []
  // Plan 4 sessions per week: Tue 18:00, Thu 18:30, Sat 10:00, optional Sun 12:00
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const day = d.getDay() // 0 Sun .. 6 Sat
    const copy = new Date(d)
    if (day === 2) workoutTargets.push({ date: new Date(copy.setHours(18,0,0,0)), time: '18:00', split: 'Push' })
    if (day === 4) workoutTargets.push({ date: new Date(copy.setHours(18,30,0,0)), time: '18:30', split: 'Upper' })
    if (day === 6) workoutTargets.push({ date: new Date(copy.setHours(10,0,0,0)), time: '10:00', split: 'Legs' })
    if (day === 0 && Math.random() < 0.5) workoutTargets.push({ date: new Date(copy.setHours(12,0,0,0)), time: '12:00', split: 'Cardio' })
  }

  const moodRows: any[] = []
  const workoutRows: any[] = []
  type ExerciseRow = { workout_id: string, exercise_name: string, position: number }
  const exRows: ExerciseRow[] = []
  type SetRow = { exercise_id: string, set_index: number, reps: number, weight_kg: number, rpe?: number }
  const setRows: SetRow[] = []

  for (const target of workoutTargets) {
    const started_at = new Date(target.date)
    const dateStr = started_at.toISOString().slice(0,10)
    const blocks = planWorkout(target.split)
    const volume = blocksVolume(blocks)
    const workout = {
      user_id: userId,
      name: `${target.split} Session`,
      day: dateStr,
      sets: blocks,
      volume,
      started_at: started_at.toISOString(),
      split_name: target.split,
      training_day: target.split,
    }
    workoutRows.push(workout)

    // Moods: pre and post
    const pre = new Date(started_at); pre.setHours(pre.getHours() - 1)
    const post = new Date(started_at); post.setHours(post.getHours() + 2); post.setMinutes(post.getMinutes() + 15)
    const baseEnergy = target.time >= '17:00' ? rand(5,8) : rand(4,7)
    const preScore = clamp(rand(5,8) + (Math.random()<0.3?-1:0), 3, 9)
    const postScore = clamp(preScore + (target.split==='Cardio'?rand(0,1):rand(1,2)), 4, 10)
    moodRows.push({
      user_id: userId,
      created_at: pre.toISOString(),
      score: preScore,
      energy: baseEnergy,
      stress: rand(2,6),
      focus: rand(4,8),
      motivation: rand(4,8),
      soreness: rand(1,5),
      pain_level: rand(0,3),
      sleep_hours: rand(6,9),
      sleep_quality: rand(5,9),
      caffeine_mg: rand(0,300),
      alcohol_units: rand(0,2),
      contexts: [pick(MOOD_TAGS)],
      triggers: [],
      post_workout: false,
      journal: `${target.split} prep`,
    })
    moodRows.push({
      user_id: userId,
      created_at: post.toISOString(),
      score: postScore,
      energy: clamp(baseEnergy + rand(0,2), 3, 10),
      stress: clamp(rand(1,4), 0, 10),
      focus: rand(5,9),
      motivation: rand(5,9),
      soreness: rand(2,6),
      pain_level: rand(0,3),
      sleep_hours: rand(6,9),
      sleep_quality: rand(5,9),
      caffeine_mg: rand(0,200),
      alcohol_units: rand(0,2),
      contexts: [pick(MOOD_TAGS)],
      triggers: [],
      post_workout: true,
      journal: `${target.split} done` ,
    })
  }

  // Add some off-day moods
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    if (Math.random() < 0.35) {
      const t = new Date(d); t.setHours(rand(8,20), rand(0,59), 0, 0)
      moodRows.push({
        user_id: userId,
        created_at: t.toISOString(),
        score: rand(4,8),
        energy: rand(3,8),
        stress: rand(1,6),
        focus: rand(3,8),
        motivation: rand(3,8),
        soreness: rand(0,5),
        pain_level: rand(0,2),
        sleep_hours: rand(6,9),
        sleep_quality: rand(5,9),
        caffeine_mg: rand(0,250),
        alcohol_units: rand(0,2),
        contexts: [pick(MOOD_TAGS)],
        triggers: [],
        post_workout: false,
        journal: 'Daily check-in',
      })
    }
  }

  // Insert in batches to avoid payload size limits
  const chunk = async <T,>(xs: T[], n: number, fn: (part: T[]) => Promise<any>) => {
    for (let i = 0; i < xs.length; i += n) {
      const part = xs.slice(i, i+n)
      const { error } = await fn(part)
      if (error) throw error
    }
  }

  // Workouts first to get IDs
  const createdWorkoutIds: string[] = []
  await chunk(workoutRows, 30, async (part) => {
    const { data, error } = await supabase.from('workouts').insert(part).select('id')
    if (!error) createdWorkoutIds.push(...(data || []).map((r: any) => r.id))
    return { error }
  })

  // For each created workout, recreate blocks for deterministic sets (same as above plan but acceptable approximation)
  for (let i = 0; i < createdWorkoutIds.length; i++) {
    const workout_id = createdWorkoutIds[i]
    const split = workoutRows[i]?.split_name || 'Upper'
    const blocks = planWorkout(split)
    // workout_exercises
    const { data: exIds, error: exErr } = await supabase
      .from('workout_exercises')
      .insert(blocks.map((b, idx) => ({ workout_id, exercise_name: b.exercise_name, position: idx+1 })))
      .select('id')
    if (exErr) throw exErr
    // workout_sets
    const exList = exIds || []
    const setPayload: any[] = []
    exList.forEach((ex: any, idx: number) => {
      const plan = blocks[idx]
      plan.sets.forEach((s, si) => {
        setPayload.push({ exercise_id: ex.id, set_index: si+1, reps: s.reps, weight_kg: s.weight_kg, rpe: rand(6,9) })
      })
    })
    if (setPayload.length) {
      const { error: setErr } = await supabase.from('workout_sets').insert(setPayload)
      if (setErr) throw setErr
    }
  }

  // Moods
  await chunk(moodRows, 200, async (part) => supabase.from('moods').insert(part))

  // Try refreshing materialized performance view if a helper function exists
  try {
    await (supabase as any).rpc('refresh_performance_rollup')
  } catch {}
  try {
    await (supabase as any).rpc('refresh_music_rollups')
  } catch {}

  console.log(`Seeded: ${createdWorkoutIds.length} workouts, ${moodRows.length} moods`)
}

main().catch((e) => { console.error(e); process.exit(1) })
