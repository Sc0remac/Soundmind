import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, serviceKey)

const userEmail = 'cormackerr@hotmail.com'

const contexts = ['Work', 'Gym', 'Family', 'Friends', 'Study']
const triggers = ['+ Great workout', '- Bad sleep', '+ Relaxing day', '- Stressful meeting']
const exercises = [
  { name: 'Bench Press', base: 80 },
  { name: 'Squat', base: 100 },
  { name: 'Deadlift', base: 120 },
  { name: 'Overhead Press', base: 50 },
  { name: 'Pull Ups', base: 0 }
]

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[], count: number) {
  const copy = [...arr]
  const res: T[] = []
  while (res.length < count && copy.length) {
    const idx = rand(0, copy.length - 1)
    res.push(copy.splice(idx, 1)[0])
  }
  return res
}

function buildWorkoutSets() {
  const blocks = pick(exercises, rand(2, 4)).map((ex) => {
    const sets = Array.from({ length: rand(2, 4) }, () => ({
      reps: rand(5, 12),
      weight: ex.base ? ex.base + rand(-10, 10) : 0
    }))
    return { exercise_name: ex.name, sets }
  })
  const volume = blocks.reduce(
    (tot, b) => tot + b.sets.reduce((s, set) => s + set.reps * (set.weight || 0), 0),
    0
  )
  return { blocks, volume }
}

async function seed() {
  const { data: { user } } = await supabase.auth.admin.getUserByEmail(userEmail)
  if (!user) throw new Error('User not found')

  const today = new Date()
  const moodRows: any[] = []
  const workoutRows: any[] = []

  for (let i = 0; i < 21; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)

    moodRows.push({
      user_id: user.id,
      created_at: d.toISOString(),
      score: rand(1, 10),
      journal: `Seeded entry for ${d.toDateString()}`,
      energy: rand(1, 10),
      stress: rand(1, 10),
      anxiety: rand(1, 10),
      focus: rand(1, 10),
      motivation: rand(1, 10),
      soreness: rand(1, 10),
      pain_level: rand(1, 10),
      sleep_hours: rand(5, 9),
      sleep_quality: rand(1, 10),
      caffeine_mg: rand(0, 300),
      alcohol_units: rand(0, 3),
      contexts: pick(contexts, rand(1, contexts.length)),
      triggers: pick(triggers, rand(1, triggers.length))
    })

    const { blocks, volume } = buildWorkoutSets()
    workoutRows.push({
      user_id: user.id,
      created_at: d.toISOString(),
      started_at: d.toISOString(),
      name: 'Session',
      day: d.toLocaleDateString('en-US', { weekday: 'long' }),
      split_name: 'Random',
      training_day: `Day ${d.getDay()}`,
      sets: blocks,
      volume
    })
  }

  await supabase.from('moods').insert(moodRows)
  await supabase.from('workouts').insert(workoutRows)
  console.log('Inserted', moodRows.length, 'moods and', workoutRows.length, 'workouts')
}

seed()
  .then(() => console.log('Done'))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
