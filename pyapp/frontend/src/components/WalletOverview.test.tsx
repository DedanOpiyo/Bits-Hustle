import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import WalletOverview from './WalletOverview'

describe('WalletOverview', () => {
  it('shows a loading state when wallet data is missing', () => {
    render(<WalletOverview wallet={null} />)

    expect(screen.getByText('Loading wallet data...')).toBeInTheDocument()
  })

  it('renders wallet metrics and status when wallet data is available', () => {
    render(
      <WalletOverview
        wallet={{
          id: 'wallet-123456',
          current_balance: 1250,
          available_balance: 1000,
          pending_earnings: 250,
          total_earned: 3200,
          total_withdrawn: 1950,
          is_active: true,
        }}
      />
    )

    expect(screen.getByText('Current Balance')).toBeInTheDocument()
    expect(screen.getByText('KES 1,250')).toBeInTheDocument()
    expect(screen.getByText('Pending Earnings')).toBeInTheDocument()
    expect(screen.getByText('KES 250')).toBeInTheDocument()
    expect(screen.getByText('Total Earned')).toBeInTheDocument()
    expect(screen.getByText('KES 3,200')).toBeInTheDocument()
    expect(screen.getByText('Total Withdrawn')).toBeInTheDocument()
    expect(screen.getByText('KES 1,950')).toBeInTheDocument()
    expect(screen.getByText(/wallet-1/i)).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })
})
