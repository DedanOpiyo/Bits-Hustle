import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LeaderboardTable } from './LeaderboardTable'

describe('LeaderboardTable', () => {
  it('shows an empty state when no rows are available', () => {
    render(<LeaderboardTable data={[]} tab="hub" />)

    expect(screen.getByText('No leaderboard data available.')).toBeInTheDocument()
  })

  it('renders national leaderboard rows with hub information', () => {
    render(
      <LeaderboardTable
        tab="national"
        data={[
          {
            rank: 1,
            ambassador: {
              user: { name: 'Amina' },
              hub_name: 'Nairobi',
            },
            wallet: {
              total_earned: 9000,
            },
            total_points: 42,
            leads_generated: 18,
            referrals_converted: 7,
            tasks_completed: 5,
          },
        ]}
      />
    )

    expect(screen.getByText('Ambassador')).toBeInTheDocument()
    expect(screen.getByText('Hub')).toBeInTheDocument()
    expect(screen.getByText('Amina')).toBeInTheDocument()
    expect(screen.getByText('Nairobi')).toBeInTheDocument()
    expect(screen.getByText('KES 9,000')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })
})
