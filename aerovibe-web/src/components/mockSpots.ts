export type MockSpot = {
  id: number
  lat: number
  lng: number
  pilot: string
  thumbnail: string
}

type Coordinate = {
  lat: number
  lng: number
}

const TOTAL_SPOTS = 50
const POLAR_PADDING = 0.15
const BAND_Y_LIMIT = 1 - POLAR_PADDING * 2 // 0.70 => deja 15% libre arriba y abajo
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

const firstNames = [
  'Lucas',
  'Sofia',
  'Mateo',
  'Camila',
  'Oliver',
  'Martina',
  'Ethan',
  'Valentina',
  'Liam',
  'Paula',
  'Noah',
  'Elena',
  'Daniel',
  'Isabella',
  'Hugo',
  'Mia',
  'Leo',
  'Emma',
  'Nicolas',
  'Julia',
]

const lastNames = [
  'Rossi',
  'Navarro',
  'Miller',
  'Silva',
  'Kovacs',
  'Ibrahim',
  'Sato',
  'Duarte',
  'Reyes',
  'Moreau',
  'Carter',
  'Almeida',
  'Nakamura',
  'Costa',
  'Herrera',
  'Novak',
  'Andersson',
  'Bennett',
  'Vega',
  'Kim',
]

const landscapeThumbnails = [
  'https://images.pexels.com/photos/414171/pexels-photo-414171.jpeg',
  'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg',
  'https://images.pexels.com/photos/355465/pexels-photo-355465.jpeg',
  'https://images.pexels.com/photos/572897/pexels-photo-572897.jpeg',
  'https://images.pexels.com/photos/210243/pexels-photo-210243.jpeg',
  'https://images.pexels.com/photos/35600/road-sun-rays-path.jpg',
  'https://images.pexels.com/photos/533769/pexels-photo-533769.jpeg',
  'https://images.pexels.com/photos/1632790/pexels-photo-1632790.jpeg',
  'https://images.pexels.com/photos/3244513/pexels-photo-3244513.jpeg',
  'https://images.pexels.com/photos/291732/pexels-photo-291732.jpeg',
  'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg',
  'https://images.pexels.com/photos/1482927/pexels-photo-1482927.jpeg',
]

function seededRandom(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let n = Math.imul(t ^ (t >>> 15), 1 | t)
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n)
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296
  }
}

const rand = seededRandom(20260227)

function distributedBandLatLng(index: number, total: number): Coordinate {
  const minY = -BAND_Y_LIMIT
  const maxY = BAND_Y_LIMIT
  const tJitter = (rand() - 0.5) * 0.72
  const thetaJitter = (rand() - 0.5) * 0.72

  const t = (index + 0.5 + tJitter) / total
  const baseY = maxY - t * (maxY - minY)
  const y = Math.max(minY + 0.02, Math.min(maxY - 0.02, baseY))
  const theta = GOLDEN_ANGLE * index + thetaJitter
  const ringRadius = Math.sqrt(Math.max(0, 1 - y * y))

  const x = Math.cos(theta) * ringRadius
  const z = Math.sin(theta) * ringRadius

  const lat = (Math.asin(y) * 180) / Math.PI
  const lng = (Math.atan2(z, x) * 180) / Math.PI

  return { lat, lng }
}

function buildPilotName(index: number) {
  const first = firstNames[index % firstNames.length]
  const last = lastNames[(index * 7) % lastNames.length]
  return `${first} ${last}`
}

function toThumbnail(index: number) {
  const base = landscapeThumbnails[index % landscapeThumbnails.length]
  return `${base}?auto=compress&cs=tinysrgb&fit=crop&w=640&h=380`
}

export const mockSpots: MockSpot[] = Array.from({ length: TOTAL_SPOTS }, (_, index) => {
  const { lat, lng } = distributedBandLatLng(index, TOTAL_SPOTS)

  return {
    id: index + 1,
    lat,
    lng,
    pilot: buildPilotName(index),
    thumbnail: toThumbnail(index),
  }
})
