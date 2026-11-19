import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { Edges, OrbitControls } from '@react-three/drei'
import { Plane, Vector3 } from 'three'
import { fabrics, models, overlaps, restore, sizes, snap, storageKey, type Layout, type Model, type Point } from './layout'
import './studio.css'

type Triple = [number, number, number]
const ground = new Plane(new Vector3(0, 1, 0), 0)
const names = { sofa: '沙发', table: '茶几' }

function Block({ size, at, color, roughness = 0.8 }: { size: Triple; at: Triple; color: string; roughness?: number }) {
  return <mesh position={at} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={roughness} /></mesh>
}

function Room({ floor }: { floor: Layout['floor'] }) {
  const oak = floor === 'oak'
  return <group>
    <Block at={[0, -0.08, 0]} size={[5, 0.16, 4]} color={oak ? '#bf986d' : '#bcc8c5'} roughness={oak ? 0.82 : 0.35} />
    {Array.from({ length: oak ? 15 : 7 }, (_, index) => <Block key={index} at={[0, 0, -2 + (index + 1) * (oak ? 0.25 : 0.5)]} size={[5, 0.001, 0.009]} color={oak ? '#94734f' : '#8b9e99'} />)}
    {!oak && Array.from({ length: 9 }, (_, index) => <Block key={index} at={[-2 + index * 0.5, 0.001, 0]} size={[0.009, 0.001, 4]} color="#8b9e99" />)}
    <Block at={[0, 0.85, -2.05]} size={[5.1, 1.7, 0.1]} color="#eee5d4" />
    <Block at={[-2.55, 0.85, 0]} size={[0.1, 1.7, 4]} color="#c8d1be" />
  </group>
}

function Furniture({ model, fabric }: { model: Model; fabric: string }) {
  if (model === 'sofa') return <group>
    <Block at={[0, 0.22, 0]} size={[2, 0.44, 0.9]} color={fabric} />
    <Block at={[0, 0.66, -0.34]} size={[2, 0.48, 0.22]} color={fabric} />
    {[-0.91, 0.91].map(x => <Block key={x} at={[x, 0.52, 0.08]} size={[0.18, 0.22, 0.74]} color={fabric} />)}
  </group>
  return <group>
    <Block at={[0, 0.41, 0]} size={[1, 0.08, 0.6]} color="#71513b" />
    {[-0.4, 0.4].flatMap(x => [-0.22, 0.22].map(z => <Block key={`${x}:${z}`} at={[x, 0.19, z]} size={[0.06, 0.38, 0.06]} color="#413f37" />))}
  </group>
}

type Drag = { model: Model; pointer: number; offset: Point }
function App() {
  const [layout, setLayout] = useState(restore)
  const [selected, select] = useState<Model | null>(null)
  const [preview, setPreview] = useState<Point | null>(null)
  const [saved, setSaved] = useState(true)
  const drag = useRef<Drag | null>(null)
  const positions = selected && preview ? { ...layout.positions, [selected]: preview } : layout.positions
  const invalid = overlaps(positions)

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(layout)); setSaved(true) }
    catch { setSaved(false) }
  }, [layout])

  function start(event: ThreeEvent<PointerEvent>, model: Model) {
    if (event.button !== 0 || drag.current) return
    const hit = event.ray.intersectPlane(ground, new Vector3())
    if (!hit) return
    event.stopPropagation()
    const point = layout.positions[model]
    drag.current = { model, pointer: event.pointerId, offset: [point[0] - hit.x, point[1] - hit.z] }
    const target = event.target as Element
    target.setPointerCapture(event.pointerId)
    select(model); setPreview(point)
  }

  function move(event: ThreeEvent<PointerEvent>, model: Model, finish: boolean) {
    const active = drag.current
    if (active?.model !== model || active.pointer !== event.pointerId) return
    event.stopPropagation()
    const hit = event.ray.intersectPlane(ground, new Vector3())
    if (hit) {
      const point = snap(model, [hit.x + active.offset[0], hit.z + active.offset[1]])
      if (!finish) setPreview(point)
      else if (!overlaps({ ...layout.positions, [model]: point })) setLayout(current => ({ ...current, positions: { ...current.positions, [model]: point } }))
    }
    if (finish) {
      drag.current = null; setPreview(null)
      const target = event.target as Element
      target.releasePointerCapture(event.pointerId)
    }
  }

  function cancel() { drag.current = null; setPreview(null) }

  return <main>
    <header><small>RENO / 3D STUDIO</small><h1>客厅工作室</h1><span>01 · 5 × 4 m</span></header>
    <section className="viewport" onPointerCancel={cancel} onLostPointerCapture={cancel}>
      <Canvas shadows camera={{ position: [5.5, 5, 6], fov: 38 }}>
        <color attach="background" args={['#e9e8e0']} /><ambientLight intensity={1.5} />
        <directionalLight castShadow position={[3, 7, 4]} intensity={2.4} />
        <Room floor={layout.floor} />
        {models.map(model => <group key={model} position={[positions[model][0], 0, positions[model][1]]}
          onPointerDown={event => start(event, model)} onPointerMove={event => move(event, model, false)} onPointerUp={event => move(event, model, true)}>
          <Furniture model={model} fabric={fabrics[layout.fabric]} />
          {model === selected && <mesh position={[0, sizes[model][1] / 2, 0]} raycast={() => {}}>
            <boxGeometry args={sizes[model]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /><Edges scale={1.02} color={invalid ? '#ee2134' : '#137a70'} />
          </mesh>}
        </group>)}
        <OrbitControls enabled={preview === null} enablePan={false} minDistance={3} maxDistance={13} maxPolarAngle={Math.PI / 2 - 0.06} target={[0, 0.4, 0]} />
      </Canvas>
    </section>
    <footer><label>沙发布料<select value={layout.fabric} onChange={event => setLayout({ ...layout, fabric: event.target.value as Layout['fabric'] })}><option value="clay">陶土红</option><option value="moss">苔绿色</option><option value="ocean">海蓝色</option></select></label>
      <label>地板材质<select value={layout.floor} onChange={event => setLayout({ ...layout, floor: event.target.value as Layout['floor'] })}><option value="oak">橡木条板</option><option value="tile">青灰方砖</option></select></label>
      <p role="status" className={invalid ? 'error' : ''}>{invalid ? '与其他家具重叠，松手将撤回' : `${selected ? `已选${names[selected]} · ` : ''}${saved ? '布局已存于此浏览器' : '浏览器存储不可用'}`}</p>
      <small>拖家具移动 · 拖空白处旋转 · 滚轮缩放</small></footer>
  </main>
}

createRoot(document.getElementById('root')!).render(<App />)
