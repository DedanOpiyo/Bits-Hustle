import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Navbar from './Navbar'

describe('Navbar', () => {
  it('renders title and custom content', () => {
    const { container } = render(
      <Navbar
        title={<span>Dashboard</span>}
        leftChildren={<span>Left</span>}
        rightChildren={<span>Right</span>}
        showMenuButton
      />
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Left')).toBeInTheDocument()
    expect(screen.getByText('Right')).toBeInTheDocument()
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
