import { Box3, Vector3 } from 'three'

export type Model = 'sofa' | 'table'
export type Point = [number, number]
export const models: Model[] = ['sofa', 'table']
export const sizes: Record<Model, [number, number, number]> = { sofa: [2, 0.9, 0.9], table: [1, 0.45, 0.6] }
export const fabrics = { clay: '#b9694d', moss: '#66785a', ocean: '#466c80' }
export type Layout = { version: 1; roomId: 'living-5x4'; positions: Record<Model, Point>; fabric: keyof typeof fabrics; floor: 'oak' | 'tile' }
export const initial: Layout = { version: 1, roomId: 'living-5x4', positions: { sofa: [-0.7, -1.4], table: [-0.7, 0] }, fabric: 'clay', floor: 'oak' }
export const storageKey = 'reno-3d-studio:layout:v1'

function snapAxis(value: number, limit: number) {
  if (Math.abs(value) >= limit - 0.15) return Math.sign(value) * limit
  return Math.round(value * 10) / 10
}

export function snap(model: Model, [x, z]: Point): Point {
  const [width, , depth] = sizes[model]
  return [snapAxis(x, (5 - width) / 2), snapAxis(z, (4 - depth) / 2)]
}

function bounds(model: Model, [x, z]: Point) {
  const [width, height, depth] = sizes[model]
  // 轻微收缩包围盒，让边缘相贴但不重叠的家具可以放置。
  return new Box3(new Vector3(x - width / 2, 0, z - depth / 2), new Vector3(x + width / 2, height, z + depth / 2)).expandByScalar(-0.00001)
}

export function overlaps(positions: Layout['positions']) {
  return bounds('sofa', positions.sofa).intersectsBox(bounds('table', positions.table))
}

export function restore(): Layout {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (data?.version !== 1 || data.roomId !== initial.roomId || !Object.hasOwn(fabrics, data.fabric) || !['oak', 'tile'].includes(data.floor)) return initial
    for (const model of models) {
      const point = data.positions?.[model]
      const [width, , depth] = sizes[model]
      if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite) || Math.abs(point[0]) > (5 - width) / 2 || Math.abs(point[1]) > (4 - depth) / 2) return initial
    }
    return overlaps(data.positions) ? initial : data
  } catch { return initial }
}
