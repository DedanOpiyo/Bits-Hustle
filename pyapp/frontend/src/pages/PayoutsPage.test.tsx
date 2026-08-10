import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PayoutsPage from './PayoutsPage'

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  createPayoutRequest: vi.fn(),
  appealPayoutRequest: vi.fn(),
  reviewPayoutRequest: vi.fn(),
}))

const authState = {
  user: { id: 'user-1' },
}

const permissionState = {
  checkPermission: vi.fn((permission: string) => ['payout_requests:read', 'payout_requests:create'].includes(permission)),
}

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../hooks/usePermissions', () => ({
  usePermissions: () => permissionState,
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      {
        id: 'payout-1',
        created_at: '2026-05-29T00:00:00.000Z',
        amount: 1200,
        method: 'mpesa',
        status: { name: 'rejected', display_name: 'Rejected' },
        rejection_reason: 'Missing proof of payout eligibility',
      },
    ],
    isLoading: false,
    error: null,
  }),
  useMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
  }),
}))

vi.mock('../services/api', () => ({
  payoutAPI: {
    getPayoutRequests: vi.fn(),
    createPayoutRequest: mocks.createPayoutRequest,
    appealPayoutRequest: mocks.appealPayoutRequest,
    reviewPayoutRequest: mocks.reviewPayoutRequest,
  },
}))

describe('PayoutsPage', () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockReset()
    mocks.createPayoutRequest.mockReset()
    mocks.appealPayoutRequest.mockReset()
    mocks.reviewPayoutRequest.mockReset()
    permissionState.checkPermission.mockImplementation((permission: string) => ['payout_requests:read', 'payout_requests:create'].includes(permission))
  })

  it('renders the payout request form and rejected payout details', () => {
    render(<PayoutsPage />)

    expect(screen.getByText('Request New Payout')).toBeInTheDocument()
    expect(screen.getByText('Minimum: KES 500')).toBeInTheDocument()
    expect(screen.getByText('Appeal')).toBeInTheDocument()
    expect(screen.getByText('Missing proof of payout eligibility')).toBeInTheDocument()
  })

  it('blocks users without payout read access', () => {
    permissionState.checkPermission.mockReturnValue(false)

    render(<PayoutsPage />)

    expect(screen.getByText("You don't have permission to view payouts")).toBeInTheDocument()
  })
})
