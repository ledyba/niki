import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SaveStatusIndicator from '@/components/SaveStatusIndicator.vue'

describe('SaveStatusIndicator.vue', () => {
  it('idle のときは何も表示しない', () => {
    const wrapper = mount(SaveStatusIndicator, {
      props: { status: { kind: 'idle', message: '' } },
    })
    expect(wrapper.text()).toBe('')
    expect(wrapper.classes()).toContain('save-status--idle')
  })

  it('saving のときは保存中と表示する', () => {
    const wrapper = mount(SaveStatusIndicator, {
      props: { status: { kind: 'saving', message: '' } },
    })
    expect(wrapper.text()).toContain('保存中')
  })

  it('error のときはメッセージを表示する', () => {
    const wrapper = mount(SaveStatusIndicator, {
      props: { status: { kind: 'error', message: '500 Internal Server Error' } },
    })
    expect(wrapper.text()).toContain('500 Internal Server Error')
  })
})
