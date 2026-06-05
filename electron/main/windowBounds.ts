export interface DisplayWorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function clampToDisplayBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  workArea: DisplayWorkArea,
): { x: number; y: number } {
  const minVisible = 32;
  const maxX = workArea.x + workArea.width - minVisible;
  const maxY = workArea.y + workArea.height - minVisible;
  const minX = workArea.x - width + minVisible;
  const minY = workArea.y - height + minVisible;
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
  };
}
