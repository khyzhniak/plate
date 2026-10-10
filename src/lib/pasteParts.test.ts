import { describe, expect, it } from 'vitest'
import { parsePasteText } from './pasteParts'

describe('parsePasteText', () => {
  it('parses two-column length×width Excel paste as happy path', () => {
    const text = '720\t560\n1000\t500\n597\t396'
    const rows = parsePasteText(text, 'mm')
    expect(rows).toHaveLength(3)
    expect(rows.every((r) => !r.error)).toBe(true)
    expect(rows[0]).toMatchObject({
      name: 'Без назви',
      length: 720,
      width: 560,
      quantity: 1,
    })
    expect(rows[1]).toMatchObject({ length: 1000, width: 500 })
  })

  it('parses length×width×qty without name', () => {
    const rows = parsePasteText('720\t560\t2\n1000\t500\t1', 'mm')
    expect(rows[0]).toMatchObject({ length: 720, width: 560, quantity: 2 })
    expect(rows[1]).toMatchObject({ quantity: 1 })
  })

  it('still supports name, length, width, qty', () => {
    const rows = parsePasteText('Бік\t720\t560\t2\tдовжина', 'mm')
    expect(rows[0]).toMatchObject({
      name: 'Бік',
      length: 720,
      width: 560,
      quantity: 2,
      grain: 'length',
    })
  })

  it('skips header rows', () => {
    const rows = parsePasteText('Довжина\tШирина\n720\t560', 'mm')
    expect(rows[0].error).toMatch(/заголовка/)
    expect(rows[1].error).toBeUndefined()
    expect(rows[1].length).toBe(720)
  })
})
