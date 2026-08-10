import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HubQRPage from './HubQRPage'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const authState = {
  user: {
    id: 'user-1',
    role: { name: 'HUB_MANAGER' },
    permissions: ['hubs:read'],
  },
}

const permissionState = {
  checkPermission: vi.fn((permission: string) => authState.user.permissions.includes(permission)),
}

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../hooks/usePermissions', () => ({
  usePermissions: () => permissionState,
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'hub') {
      return {
        data: { id: 'hub-1', name: 'Headquarters', location: 'Nairobi CBD' },
        isLoading: false,
      }
    }

    return { data: null, isLoading: false }
  },
}))

describe('HubQRPage', () => {
  beforeEach(() => {
    permissionState.checkPermission.mockImplementation((permission: string) => authState.user.permissions.includes(permission))
  })

  it('renders hub QR page with hub info and copy action', () => {
    render(
      <MemoryRouter initialEntries={['/hub/qr/hub-1']}>
        <Routes>
          <Route path="/hub/qr/:hubId" element={<HubQRPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Check-in QR')).toBeInTheDocument()
    expect(screen.getByText(/Headquarters/)).toBeInTheDocument()
    expect(screen.getByText(/Nairobi CBD/)).toBeInTheDocument()
    expect(screen.getByText('Copy Code')).toBeInTheDocument()
    expect(screen.getByText('Download QR')).toBeInTheDocument()
  })
})
