import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AttendanceAnalyticsPage from './AttendanceAnalyticsPage'

const authState = {
  user: {
    id: 'user-1',
    role: { name: 'HUB_MANAGER' },
    permissions: ['analytics:read'],
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
    const key = queryKey[0]

    if (key === 'hubs') {
      return {
        data: [{ id: 'hub-1', name: 'Campus Hub', location: 'Nairobi', manager_id: 'user-1' }],
        isLoading: false,
      }
    }

    if (key === 'hub-attendance-trends') {
      return {
        data: [
          { date: '2026-06-01', checkins: 4, uniqueAmbassadors: 3 },
          { date: '2026-06-02', checkins: 6, uniqueAmbassadors: 5 },
          { date: '2026-06-03', checkins: 3, uniqueAmbassadors: 3 },
        ],
        isLoading: false,
        isError: false,
      }
    }

    return { data: [], isLoading: false }
  },
}))

describe('AttendanceAnalyticsPage', () => {
  beforeEach(() => {
    permissionState.checkPermission.mockImplementation((permission: string) => authState.user.permissions.includes(permission))
  })

  it('renders analytics summary and table', () => {
    render(<AttendanceAnalyticsPage />)

    expect(screen.getByText('Attendance Analytics')).toBeInTheDocument()
    expect(screen.getByText('Hub check-in trends and performance')).toBeInTheDocument()
    expect(screen.getByText('13')).toBeInTheDocument()
    expect(screen.getByText('11')).toBeInTheDocument()
    expect(screen.getByText('check-ins per day')).toBeInTheDocument()
  })
})
