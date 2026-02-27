import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { useTheme } from '../app/theme'
import { GlobePoints } from './GlobePoints'
import { mockSpots, type MockSpot } from './mockSpots'
import styles from './GlobeHero.module.css'

const GLOBE_RADIUS = 2.8
const GLOBE_SCALE = 2
const GLOBE_OFFSET_Y = 0

function GlobeScene({
  theme,
  hoveredSpot,
  activeSpotIds,
  onHoverSpot,
}: {
  theme: 'dark' | 'light'
  hoveredSpot: MockSpot | null
  activeSpotIds: number[]
  onHoverSpot: (spot: MockSpot | null) => void
}) {
  const globeRef = useRef<THREE.Group>(null)
  const isLight = theme === 'light'

  useFrame(() => {
    if (!globeRef.current || hoveredSpot) return
    globeRef.current.rotation.y += 0.00025
  })

  return (
    <group ref={globeRef} scale={GLOBE_SCALE} position={[0, GLOBE_OFFSET_Y, 0]}>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 96, 96]} />
        <meshStandardMaterial
          color={isLight ? '#dbe4ea' : '#0b0f14'}
          metalness={0.26}
          roughness={0.58}
          emissive={isLight ? '#ecf6ff' : '#07131b'}
          emissiveIntensity={isLight ? 0.18 : 0.3}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.03, 96, 96]} />
        <meshBasicMaterial
          color={isLight ? '#3f9eff' : '#29a7ff'}
          transparent
          opacity={isLight ? 0.14 : 0.09}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.055, 96, 96]} />
        <meshBasicMaterial
          color={isLight ? '#22d789' : '#31f6a4'}
          transparent
          opacity={isLight ? 0.12 : 0.08}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <GlobePoints
        theme={theme}
        spots={mockSpots}
        radius={GLOBE_RADIUS}
        hoveredSpotId={hoveredSpot?.id ?? null}
        activeSpotIds={activeSpotIds}
        onHoverSpot={onHoverSpot}
      />
    </group>
  )
}

function pickRandomSpotIds(count: number, exclude: number[] = []) {
  const preferredPool = mockSpots
    .filter((spot) => Math.abs(spot.lat) <= 42 && Math.abs(spot.lng) <= 120)
    .map((spot) => spot.id)
    .filter((id) => !exclude.includes(id))
  const fallbackPool = mockSpots.map((spot) => spot.id).filter((id) => !exclude.includes(id))
  const pool = preferredPool.length >= count ? preferredPool : fallbackPool
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

function pickRandomSpotId(exclude: number[] = []) {
  const candidates = pickRandomSpotIds(1, exclude)
  return candidates.length ? candidates[0] : null
}

function makeInitialPreviewPair() {
  const first = pickRandomSpotId()
  if (!first) return []
  const second = pickRandomSpotId([first])
  if (!second) return [first]
  return [first, second]
}

function replacePreviewSlot(current: number[], slotIndex: 0 | 1) {
  if (current.length < 2) return makeInitialPreviewPair()
  const otherSlotIndex = slotIndex === 0 ? 1 : 0
  const next = [...current]
  const replacement = pickRandomSpotId([next[slotIndex], next[otherSlotIndex]])
  if (!replacement) return current
  next[slotIndex] = replacement
  return next
}

export function GlobeHero() {
  const { theme } = useTheme()
  const [hoveredSpot, setHoveredSpot] = useState<MockSpot | null>(null)
  const [autoPreviewSpotIds, setAutoPreviewSpotIds] = useState<number[]>(() => makeInitialPreviewPair())

  useEffect(() => {
    if (hoveredSpot) return undefined

    const timerA = window.setInterval(() => {
      setAutoPreviewSpotIds((current) => replacePreviewSlot(current, 0))
    }, 2600)

    let timerB: number | undefined
    const bootstrapDelay = window.setTimeout(() => {
      setAutoPreviewSpotIds((current) => replacePreviewSlot(current, 1))
      timerB = window.setInterval(() => {
        setAutoPreviewSpotIds((current) => replacePreviewSlot(current, 1))
      }, 2600)
    }, 1300)

    return () => {
      window.clearInterval(timerA)
      window.clearTimeout(bootstrapDelay)
      if (timerB) window.clearInterval(timerB)
    }
  }, [hoveredSpot])

  const activeSpotIds = hoveredSpot ? [hoveredSpot.id] : autoPreviewSpotIds

  return (
    <div className={styles.shell}>
      <Canvas
        camera={{ position: [0, 0, 10.2], fov: 70 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.58} />
        <pointLight
          position={[3.4, 2.2, 5]}
          intensity={theme === 'light' ? 1.1 : 1.4}
          color={theme === 'light' ? '#2dcf8f' : '#3cf2ac'}
        />
        <directionalLight
          position={[-4, 2, 4]}
          intensity={theme === 'light' ? 0.9 : 0.7}
          color={theme === 'light' ? '#5ca7f3' : '#6cb7ff'}
        />
        <GlobeScene
          theme={theme}
          hoveredSpot={hoveredSpot}
          activeSpotIds={activeSpotIds}
          onHoverSpot={setHoveredSpot}
        />
        <OrbitControls
          target={[0, GLOBE_OFFSET_Y, 0]}
          enableRotate={false}
          enableZoom={false}
          enablePan={false}
        />
      </Canvas>

      {hoveredSpot ? (
        <div className={`${styles.previewCard} ${styles.previewCardVisible}`}>
          <img
            src={hoveredSpot.thumbnail}
            alt={hoveredSpot.pilot}
            className={styles.previewThumb}
            loading="lazy"
          />
          <div className={styles.previewMeta}>
            <div className={styles.previewPilot}>{hoveredSpot.pilot}</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
