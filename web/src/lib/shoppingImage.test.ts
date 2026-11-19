import { describe, expect, it } from 'vitest'
import { cropSquare } from './shoppingImage'

describe('cropSquare', () => {
  it('covers the short side at zoom 1', () => {
    expect(cropSquare(400, 200, { zoom: 1, x: 0.5, y: 0.5 })).toEqual({ sx: 100, sy: 0, side: 200 })
  })
  it('zooms in on the centre', () => {
    const { side, sx, sy } = cropSquare(400, 400, { zoom: 2, x: 0.5, y: 0.5 })
    expect(side).toBe(200)
    expect(sx).toBe(100)
    expect(sy).toBe(100)
  })
  it('never leaves the photo', () => {
    const { sx, sy, side } = cropSquare(400, 200, { zoom: 2, x: -1, y: 5 })
    expect(sx).toBe(0)
    expect(sy + side).toBe(200)
  })
})
