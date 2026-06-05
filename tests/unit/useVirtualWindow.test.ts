import { describe, it, expect } from 'vitest';
import { computeVirtualWindow } from '@/hooks/useVirtualWindow';

describe('computeVirtualWindow', () => {
  it('computes totalHeight from itemCount * itemHeight', () => {
    const result = computeVirtualWindow(1000, 40, 0, 600, 5);
    expect(result.totalHeight).toBe(40000);
  });

  it('initial startIndex is 0 with overscan', () => {
    const result = computeVirtualWindow(100, 40, 0, 600, 5);
    expect(result.startIndex).toBe(0);
  });

  it('clamps endIndex to itemCount', () => {
    const result = computeVirtualWindow(10, 40, 0, 0, 100);
    expect(result.endIndex).toBeLessThanOrEqual(10);
  });

  it('startIndex is negative-safe when scrollTop is 0 and overscan is large', () => {
    const result = computeVirtualWindow(10, 40, 0, 600, 100);
    expect(result.startIndex).toBe(0);
  });

  it('offsetY equals startIndex * itemHeight', () => {
    const result = computeVirtualWindow(100, 40, 0, 600, 5);
    expect(result.offsetY).toBe(result.startIndex * 40);
  });

  it('endIndex is itemCount when scrollTop is at the bottom', () => {
    const result = computeVirtualWindow(10, 40, 100000, 600, 0);
    expect(result.endIndex).toBe(10);
  });
});
