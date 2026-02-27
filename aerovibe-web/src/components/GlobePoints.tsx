import { Html, Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import type { MockSpot } from './mockSpots'

type GlobePointsProps = {
  theme: 'dark' | 'light'
  spots: MockSpot[]
  radius: number
  hoveredSpotId: number | null
  activeSpotIds: number[]
  onHoverSpot: (spot: MockSpot | null) => void
}

type PointData = {
  spot: MockSpot
  position: THREE.Vector3
  pulsePhase: number
  connectorOffset: THREE.Vector3
  previewOffset: THREE.Vector3
}

function spotToCartesian(lat: number, lng: number, radius: number) {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lng + 180)

  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)

  return new THREE.Vector3(x, y, z)
}

export function GlobePoints({
  theme,
  spots,
  radius,
  hoveredSpotId,
  activeSpotIds,
  onHoverSpot,
}: GlobePointsProps) {
  const refs = useRef<Array<THREE.Mesh | null>>([])
  const activeSpotIdSet = useMemo(() => new Set(activeSpotIds), [activeSpotIds])
  const isLight = theme === 'light'
  const linkColor = isLight ? '#2ebc88' : '#45e7a2'
  const pointColor = isLight ? '#1f8e67' : '#7dffba'
  const pointGlowColor = isLight ? '#30ce95' : '#30f59f'
  const previewBorder = isLight ? '1px solid rgba(10, 28, 20, 0.22)' : '1px solid rgba(120,255,198,0.26)'
  const previewBg = isLight ? 'rgba(250, 253, 255, 0.9)' : 'rgba(4,8,12,0.75)'
  const previewShadow = isLight ? '0 10px 24px rgba(10, 20, 22, 0.22)' : '0 10px 24px rgba(0,0,0,0.34)'
  const previewText = isLight ? '#0e1c24' : '#e8f3ee'
  const previewImageBorder = isLight
    ? '1px solid rgba(10, 28, 20, 0.2)'
    : '1px solid rgba(120,255,198,0.24)'

  const points = useMemo<PointData[]>(
    () =>
      spots.map((spot) => {
        const position = spotToCartesian(spot.lat, spot.lng, radius)
        const outward = position.clone().normalize()
        const inward = outward.clone().multiplyScalar(-1)
        const tangent = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), outward)
        if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0)
        tangent.normalize()
        const side = position.x >= 0 ? -1 : 1
        const verticalNudge =
          position.y > radius * 0.35 ? -0.05 : position.y < -radius * 0.35 ? 0.05 : 0

        const connectorOffset = inward
          .clone()
          .multiplyScalar(0.1)
          .add(tangent.clone().multiplyScalar(0.026 * side))
        connectorOffset.y += verticalNudge * 0.5

        const previewOffset = inward
          .clone()
          .multiplyScalar(0.21)
          .add(tangent.clone().multiplyScalar(0.056 * side))
        previewOffset.y += verticalNudge

        return {
          spot,
          position,
          pulsePhase: (spot.id % 17) * 0.41,
          connectorOffset,
          previewOffset,
        }
      }),
    [spots, radius],
  )

  const connections = useMemo<Array<[number, number]>>(() => {
    const edges: Array<[number, number]> = []
    for (let i = 0; i < points.length; i += 3) {
      const j = (i * 7 + 11) % points.length
      if (i !== j) edges.push([i, j])
    }
    return edges.slice(0, 18)
  }, [points])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    points.forEach((point, idx) => {
      const mesh = refs.current[idx]
      if (!mesh) return
      const isHovered = hoveredSpotId === point.spot.id
      const pulse = 1 + Math.sin(t * 2.4 + point.pulsePhase) * 0.18
      mesh.scale.setScalar(isHovered ? 1.7 : pulse)
    })
  })

  return (
    <>
      {connections.map(([a, b]) => (
        <Line
          key={`link-${a}-${b}`}
          points={[
            points[a].position.clone().multiplyScalar(1.002),
            points[b].position.clone().multiplyScalar(1.002),
          ]}
          color={linkColor}
          transparent
          opacity={isLight ? 0.16 : 0.22}
          lineWidth={1}
        />
      ))}

      {points.map((point, idx) => {
        const isHovered = hoveredSpotId === point.spot.id
        const showAutoPreview = activeSpotIdSet.has(point.spot.id)
        const connectorDirection = point.previewOffset.clone().normalize()
        const connectorLength = point.previewOffset.length()
        const connectorCenter = point.previewOffset.clone().multiplyScalar(0.5)
        const connectorQuat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          connectorDirection,
        )
        return (
          <group
            key={point.spot.id}
            position={point.position.toArray()}
            onPointerEnter={(event) => {
              event.stopPropagation()
              onHoverSpot(point.spot)
            }}
            onPointerLeave={(event) => {
              event.stopPropagation()
              onHoverSpot(null)
            }}
          >
            <mesh
              ref={(node) => {
                refs.current[idx] = node
              }}
            >
              <sphereGeometry args={[0.04, 12, 12]} />
              <meshBasicMaterial color={pointColor} toneMapped={false} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.072, 12, 12]} />
              <meshBasicMaterial
                color={pointGlowColor}
                transparent
                opacity={isHovered ? (isLight ? 0.45 : 0.52) : isLight ? 0.2 : 0.28}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>

            {showAutoPreview ? (
              <>
                <mesh position={connectorCenter.toArray()} quaternion={connectorQuat} renderOrder={30}>
                  <cylinderGeometry args={[0.006, 0.006, connectorLength, 10]} />
                  <meshBasicMaterial
                    color={linkColor}
                    transparent
                    opacity={0.9}
                    depthTest={false}
                    depthWrite={false}
                    toneMapped={false}
                  />
                </mesh>
                <Line
                  points={[
                    [0, 0, 0],
                    point.connectorOffset.toArray(),
                    point.previewOffset.toArray(),
                  ]}
                  color={linkColor}
                  transparent
                  opacity={0.62}
                  depthTest={false}
                  depthWrite={false}
                  lineWidth={1}
                  renderOrder={31}
                />
                <mesh position={point.previewOffset.toArray()}>
                  <sphereGeometry args={[0.012, 8, 8]} />
                  <meshBasicMaterial
                    color={pointGlowColor}
                    transparent
                    opacity={0.9}
                    depthWrite={false}
                    toneMapped={false}
                  />
                </mesh>
                <Html
                  position={point.previewOffset.toArray()}
                  transform
                  sprite
                  center
                  distanceFactor={8}
                  style={{ pointerEvents: 'none' }}
                >
                  <div
                    style={{
                      width: '98px',
                      borderRadius: '10px',
                      border: previewBorder,
                      background: previewBg,
                      boxShadow: previewShadow,
                      padding: '6px',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <img
                      src={point.spot.thumbnail}
                      alt={point.spot.pilot}
                      loading="lazy"
                      onError={(event) => {
                        const image = event.currentTarget
                        if (image.dataset.fallbackApplied === '1') return
                        image.dataset.fallbackApplied = '1'
                        image.src = 'https://picsum.photos/seed/aerovibe-fallback/320/180'
                      }}
                      style={{
                        width: '100%',
                        height: '52px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: previewImageBorder,
                      }}
                    />
                    <div
                      style={{
                        marginTop: '6px',
                        fontSize: '10px',
                        color: previewText,
                        fontWeight: 700,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {point.spot.pilot}
                    </div>
                  </div>
                </Html>
              </>
            ) : null}
          </group>
        )
      })}
    </>
  )
}
