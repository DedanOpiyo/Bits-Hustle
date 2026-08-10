import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReferralsPage from './ReferralsPage'

const mocks = vi.hoisted(() => ({
  getReferrals: vi.fn(),
  getMyReferrals: vi.fn(),
}))

const authState = {
  user: { id: 'user-1', permissions: ['referrals:read', 'referrals:create'] },
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
    if (queryKey[0] === 'referrals') {
      return {
        data: [
          {
            id: 'ref-1',
            name: 'John Doe',
            platform: { display_name: 'TikTok' },
            action: 'SUBSCRIPTION_SIGNUP',
            conversion_status: 'CONVERTED',
            created_at: '2026-05-29T12:00:00.000Z',
          },
        ],
        isLoading: false,
        error: null,
      }
    }

    return { data: [], isLoading: false, error: null }
  },
}))

vi.mock('../services/api', () => ({
  referralAPI: {
    getMyReferrals: mocks.getMyReferrals,
    getReferrals: mocks.getReferrals,
  },
}))

describe('ReferralsPage', () => {
  beforeEach(() => {
    mocks.getReferrals.mockReset()
    mocks.getMyReferrals.mockReset()
    permissionState.checkPermission.mockImplementation((permission: string) => authState.user.permissions.includes(permission))
  })

  it('renders referral tracking note and table rows', () => {
    render(<ReferralsPage />)

    expect(screen.getByText('Your Referrals')).toBeInTheDocument()
    expect(screen.getByText(/Referrals are created automatically/)).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Platform')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('CONVERTED')).toBeInTheDocument()
  })
})
