import assert from "node:assert/strict"
import test from "node:test"
import Matter from "matter-js"
import decomp from "poly-decomp"

import { parsePathToVertices } from "./svg-path-to-vertices.ts"

Matter.Common.setDecomp(decomp)

test("a zárt SVG útvonal kezdőpontját nem ismétli meg a végén", () => {
  const vertices = parsePathToVertices(
    "M32 4 39.4 22.3 59 23.6 44 36.3 48.8 55.4 32 45 15.2 55.4 20 36.3 5 23.6 24.6 22.3Z",
    7
  )

  assert.notDeepEqual(vertices.at(-1), vertices[0])
  assert.ok(Matter.Bodies.fromVertices(100, 100, [vertices], {}))
})

test("a nyitott SVG útvonal végpontját megtartja", () => {
  const vertices = parsePathToVertices("M0 0 L10 0", 6)

  assert.deepEqual(vertices.at(-1), { x: 10, y: 0 })
})
