import { describe, it, expect } from 'vitest'
import router from '@/router'

describe('router', () => {
  it('/ は今月の /YYYY/MM にリダイレクトする', async () => {
    await router.push('/')
    await router.isReady()
    const now = new Date()
    const year = `${now.getFullYear()}`.padStart(4, '0')
    const month = `${now.getMonth() + 1}`.padStart(2, '0')
    expect(router.currentRoute.value.fullPath).toBe(`/${year}/${month}`)
    expect(router.currentRoute.value.name).toBe('MonthList')
  })

  it('/YYYY/MM を MonthList に解決する', () => {
    const resolved = router.resolve('/2026/08')
    expect(resolved.name).toBe('MonthList')
    expect(resolved.params).toEqual({ year: '2026', month: '08' })
  })
})
