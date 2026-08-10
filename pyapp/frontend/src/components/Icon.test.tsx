import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Icon } from './Icon'

describe('Icon', () => {
  it('renders the requested icon', () => {
    const { container } = render(<Icon name="wallet" />)

    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveClass('w-5', 'h-5')
  })
})
