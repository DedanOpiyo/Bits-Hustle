import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import MainLayout from './MainLayout'

const authState = {
  user: {
    id: 'user-1',
    name: 'Amina Kariuki',
    role: { display_name: 'Ambassador' },
  },
  logout: vi.fn(),
}

const permissionState = {
  checkPermission: vi.fn((permission: string) => ['tasks:read', 'wallet:read'].includes(permission)),
}

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../hooks/usePermissions', () => ({
  usePermissions: () => permissionState,
}))

describe('MainLayout', () => {
  it('renders title, visible nav items, and user menu details', () => {
    render(
      <MemoryRouter initialEntries={['/tasks']}>
        <MainLayout title="Tasks">
          <div>Page content</div>
        </MainLayout>
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument()
    expect(screen.getByText('Page content')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getAllByText('Tasks').length).toBeGreaterThan(0)
    expect(screen.getByText('Wallet')).toBeInTheDocument()
    expect(screen.queryByText('Finance')).not.toBeInTheDocument()
    expect(screen.getByText('Amina Kariuki')).toBeInTheDocument()
    expect(screen.getByText('Ambassador')).toBeInTheDocument()
  })
})
