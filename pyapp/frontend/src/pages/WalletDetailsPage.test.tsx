import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WalletDetailsPage from './WalletDetailsPage'

const authStateWithAmbassador = {
  user: {
    ambassador_profile: { id: 'amb-1' },
    role: { name: 'AMBASSADOR' },
  },
}

const authStateWithoutAmbassador = {
  user: {
    ambassador_profile: null,
    ambassador_id: null,
    role: { name: 'FINANCE_OFFICER' }, // A role that has wallet:read permission
  },
}

const permissionState = {
  checkPermission: vi.fn((permission: string) => permission === 'wallet:read'),
  checkRole: vi.fn((role: string) => role === 'AMBASSADOR'),
}

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authStateWithAmbassador, // default, will be overridden in specific tests
}))

vi.mock('../hooks/usePermissions', () => ({
  usePermissions: () => permissionState,
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'wallet-details') {
      return {
        data: {
          current_balance: 1500,
          pending_earnings: 250,
          total_earned: 2750,
          total_withdrawn: 1000,
          balance_by_platform: [
            { platform_id: 'p1', platform_name: 'TikTok', total_earned: 2000 },
          ],
          transaction_history: [
            {
              id: 'tx-1',
              created_at: '2026-05-29T12:00:00.000Z',
              description: 'Task reward',
              amount: 500,
              type: 'EARNING',
              platform: { display_name: 'TikTok' },
            },
          ],
        },
        isLoading: false,
        error: null,
      }
    }

    return { data: null, isLoading: false, error: null }
  },
}))

vi.mock('../services/api', () => ({
  ambassadorAPI: {
    getWallet: vi.fn().mockResValue({
      data: {
        id: 'wallet-1',
      },
    }),
  },
  walletAPI: {
    getWalletDetails: vi.fn().mockResValue({
      data: {
        current_balance: 1500,
        pending_earnings: 250,
        total_earned: 2750,
        total_withdrawn: 1000,
        balance_by_platform: [
          { platform_id: 'p1', platform_name: 'TikTok', total_earned: 2000 },
        ],
        transaction_history: [
          {
            id: 'tx-1',
            created_at: '2026-05-29T12:00:00.000Z',
            description: 'Task reward',
            amount: 500,
            type: 'EARNING',
            platform: { display_name: 'TikTok' },
          },
        ],
      },
    }),
  },
}))

describe('WalletDetailsPage', () => {
  it('renders wallet breakdown and transaction history for ambassador', () => {
    render(<WalletDetailsPage />)

    expect(screen.getByText('Wallet Details')).toBeInTheDocument()
    expect(screen.getByText('KES 1,500')).toBeInTheDocument()
    expect(screen.getByText('KES 250')).toBeInTheDocument()
    expect(screen.getByText('KES 2,750')).toBeInTheDocument()
    expect(screen.getByText('KES 1,000')).toBeInTheDocument()
    expect(screen.getAllByText('TikTok').length).toBeGreaterThan(0)
    expect(screen.getByText('+KES 500')).toBeInTheDocument()
  })

  it('shows message when user is not an ambassador', () => {
    // Override the auth context mock for this test
    vi.mocked(require('../contexts/AuthContext').useAuth).mockReturnValue(
      authStateWithoutAmbassador
    )
    // Adjust permission mock: FINANCE_OFFICER should have wallet:read permission but not AMBASSADOR role
    permissionState.checkPermission.mockImplementation((permission: string) => {
      return permission === 'wallet:read'
    })
    permissionState.checkRole.mockImplementation((role: string) => {
      return role === 'AMBASSADOR' // This will be false for FINANCE_OFFICER
    })

    render(<WalletDetailsPage />)

    expect(
      screen.getByText(/you must be an ambassador to view wallet details/i)
    ).toBeInTheDocument()
  })

  it('blocks access without wallet permission', () => {
    permissionState.checkPermission.mockReturnValue(false)
    permissionState.checkRole.mockReturnValue(false)

    render(<WalletDetailsPage />)

    expect(
      screen.getByText("You don't have permission to view wallet details")
    ).toBeInTheDocument()
  })
})
