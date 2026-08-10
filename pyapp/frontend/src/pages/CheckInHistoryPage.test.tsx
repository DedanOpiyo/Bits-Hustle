import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CheckInHistoryPage from './CheckInHistoryPage'

const authState = {
  user: {
    id: 'user-1',
    permissions: ['check_ins:create'],
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
    if (queryKey[0] === 'checkins') {
      return {
        data: [
          {
            id: 'ci-1',
            check_in_time: '2026-06-04T08:10:00.000Z',
            check_out_time: '2026-06-04T10:25:00.000Z',
            hub: { name: 'Main Hub' },
          },
          {
            id: 'ci-2',
            check_in_time: '2026-06-03T09:00:00.000Z',
            check_out_time: null,
            hub: { name: 'West Hub' },
          },
        ],
        isLoading: false,
      }
    }

    return { data: [], isLoading: false }
  },
}))

describe('CheckInHistoryPage', () => {
  beforeEach(() => {
    permissionState.checkPermission.mockImplementation((permission: string) => authState.user.permissions.includes(permission))
  })

  it('renders history table with rows', () => {
    render(<CheckInHistoryPage />)

    expect(screen.getByText('Check-In History')).toBeInTheDocument()
    expect(screen.getByText('Main Hub')).toBeInTheDocument()
    expect(screen.getByText('West Hub')).toBeInTheDocument()
  })
})
