import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import NotificationsPage from './NotificationsPage'

const authState = {
  user: { id: 'user-1', permissions: ['notifications:read'] },
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

vi.mock('../constants/platforms', () => ({
  usePlatforms: () => ({
    data: [
      { id: 'platform-1', displayName: 'TikTok' },
    ],
    isLoading: false,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      {
        id: 'notif-1',
        title: 'New payout',
        message: 'Your payout is ready',
        is_read: false,
        data: { platform_id: 'platform-1' },
      },
    ],
    isLoading: false,
    error: null,
  }),
  useMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}))

vi.mock('../services/api', () => ({
  notificationAPI: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
  },
}))

describe('NotificationsPage', () => {
  it('renders notifications with platform attribution', () => {
    render(<NotificationsPage />)

    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('New payout')).toBeInTheDocument()
    expect(screen.getByText('Platform: TikTok')).toBeInTheDocument()
    expect(screen.getByText('Your payout is ready')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mark All as Read/i })).toBeInTheDocument()
  })

  it('blocks access without notification permission', () => {
    permissionState.checkPermission.mockReturnValue(false)

    render(<NotificationsPage />)

    expect(screen.getByText("You don't have permission to view notifications")).toBeInTheDocument()
  })
})
