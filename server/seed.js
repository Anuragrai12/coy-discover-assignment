import { randomUUID } from 'node:crypto'

const names = [
  'Aanya', 'Arjun', 'Mira', 'Kabir', 'Ishani', 'Rohan', 'Tara', 'Dev',
  'Naina', 'Aditya', 'Kiara', 'Vihaan', 'Anika', 'Ishaan', 'Diya', 'Neil',
  'Meera', 'Aryan', 'Riya', 'Advait', 'Sana', 'Dhruv', 'Ira', 'Reyansh',
  'Zoya', 'Karan', 'Avni', 'Vikram', 'Myra', 'Aarav'
]

const interests = [
  ['Photography', 'Coffee', 'Hiking'], ['Cooking', 'Music', 'Travel'],
  ['Books', 'Film', 'Cycling'], ['Design', 'Running', 'Podcasts'],
  ['Art', 'Dance', 'Street food'], ['Bouldering', 'Chess', 'Live music']
]

const bios = [
  'Usually taking the scenic route, preferably with good coffee and a camera.',
  'I make a great Sunday brunch and always have a playlist for the road.',
  'Looking for someone to trade book recs and split popcorn with.',
  'Weekend plans usually involve a long run and a new neighborhood.',
  'I like tiny galleries, lively kitchens, and evenings that turn into stories.',
  'My ideal Saturday ends with a gig and starts somewhere outdoors.'
]

const cities = ['Bengaluru', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad']

export function seedProfiles(db) {
  db.exec('BEGIN IMMEDIATE')
  try {
    if (!db.prepare('SELECT 1 FROM profiles LIMIT 1').get()) {
      const insert = db.prepare('INSERT INTO profiles (id, payload, incoming_like) VALUES (?, ?, ?)')
      const guaranteedMatch = Math.floor(Math.random() * 4)
      names.forEach((name, index) => {
        const id = randomUUID()
        const profile = {
          id, name, age: 22 + (index % 7), city: cities[index % cities.length],
          bio: bios[index % bios.length], interests: interests[index % interests.length],
          photo: '/portraits/' + name.toLowerCase() + '.jpg'
        }
        insert.run(id, JSON.stringify(profile), index === guaranteedMatch || Math.random() < 0.24 ? 1 : 0)
      })
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
