import { render, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import PrivateRoute from './PrivateRoute'

const authState = {
  user: null as unknown,
  loading: false,
}

const permissionState = {
  checkPermission: vi.fn(() => true),
}

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../hooks/usePermissions', () => ({
  usePermissions: () => permissionState,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
      <div data-testid="navigate" data-to={to} data-replace={String(Boolean(replace))} />
    ),
    Outlet: () => <div data-testid="outlet" />,
  }
})

describe('PrivateRoute', () => {
  beforeEach(() => {
    authState.user = null
    authState.loading = false
    permissionState.checkPermission.mockReset()
    permissionState.checkPermission.mockReturnValue(true)
  })

  it('shows a loading spinner while auth state is loading', () => {
    authState.loading = true

    const { container } = render(<PrivateRoute />)

    expect(container.querySelector('.loading-spinner')).toBeInTheDocument()
    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument()
  })

  it('redirects unauthenticated users to login', () => {
    render(<PrivateRoute />)

    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login')
  })

  it('redirects users without permission to the dashboard', () => {
    authState.user = { id: '1' }
    permissionState.checkPermission.mockReturnValue(false)

    render(<PrivateRoute requiredPermission="tasks:read" />)

    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/dashboard')
  })

  it('renders the protected outlet when the user is authorized', () => {
    authState.user = { id: '1' }

    render(<PrivateRoute requiredPermission="tasks:read" />)

    expect(screen.getByTestId('outlet')).toBeInTheDocument()
  })
})
