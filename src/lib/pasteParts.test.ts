import { describe, expect, it } from 'vitest'
import { parsePasteText } from './pasteParts'

describe('parsePasteText', () => {
  it('parses canonical two-column length×width TSV', () => {
    const text = '1288\t38\n1414\t38\n2224\t50\n2224\t63'
    const rows = parsePasteText(text, 'mm')
    expect(rows).toHaveLength(4)
    expect(rows.every((r) => !r.error)).toBe(true)
    expect(rows[0]).toMatchObject({
      length: 1288,
      width: 38,
      quantity: 1,
    })
    expect(rows[3]).toMatchObject({ length: 2224, width: 63 })
  })

  it('parses optional qty as third column', () => {
    const rows = parsePasteText('720\t560\t2\n1000\t500\t1', 'mm')
    expect(rows[0]).toMatchObject({ length: 720, width: 560, quantity: 2 })
    expect(rows[1]).toMatchObject({ quantity: 1 })
  })

  it('still supports name, length, width, qty', () => {
    const rows = parsePasteText('Бік\t720\t560\t2', 'mm')
    expect(rows[0]).toMatchObject({
      name: 'Бік',
      length: 720,
      width: 560,
      quantity: 2,
    })
  })

  it('skips header rows', () => {
    const rows = parsePasteText('Довжина\tШирина\n720\t560', 'mm')
    expect(rows[0].error).toMatch(/заголовка/)
    expect(rows[1].error).toBeUndefined()
    expect(rows[1].length).toBe(720)
  })
})
