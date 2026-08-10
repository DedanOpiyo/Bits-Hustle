import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import LoadingSpinner from './LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders the requested size class', () => {
    const { container } = render(<LoadingSpinner size="lg" />)

    expect(container.querySelector('span')).toHaveClass('loading-spinner', 'loading-lg')
  })
})
