import SVGPathCommander from "svg-path-commander"

function pointsMatch(
  first: { x: number; y: number },
  second: { x: number; y: number }
) {
  return (
    Math.abs(first.x - second.x) < 0.001 &&
    Math.abs(first.y - second.y) < 0.001
  )
}

// Function to convert SVG path `d` to vertices
export function parsePathToVertices(path: string, sampleLength = 15) {
  // Convert path to absolute commands
  const commander = new SVGPathCommander(path)

  const points: { x: number; y: number }[] = []
  let lastPoint: { x: number; y: number } | null = null

  // Get total length of the path
  const totalLength = commander.getTotalLength()
  let length = 0

  // Sample points along the path
  while (length < totalLength) {
    const point = commander.getPointAtLength(length)

    // Only add point if it's different from the last one
    if (!lastPoint || point.x !== lastPoint.x || point.y !== lastPoint.y) {
      points.push({ x: point.x, y: point.y })
      lastPoint = point
    }

    length += sampleLength
  }

  // Ensure open paths include their endpoint. Closed SVG paths end where they
  // started; repeating that point makes poly-decomp treat some shapes as
  // self-intersecting and Matter.js cannot create a body from them.
  if (
    points.length > 1 &&
    pointsMatch(points[points.length - 1], points[0])
  ) {
    points.pop()
    lastPoint = points[points.length - 1] ?? null
  }

  const finalPoint = commander.getPointAtLength(totalLength)
  const firstPoint = points[0]
  if (
    lastPoint &&
    !pointsMatch(finalPoint, lastPoint) &&
    (!firstPoint || !pointsMatch(finalPoint, firstPoint))
  ) {
    points.push({ x: finalPoint.x, y: finalPoint.y })
  }

  return points
}
