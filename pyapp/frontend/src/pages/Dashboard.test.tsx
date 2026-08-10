import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import Dashboard from './Dashboard'

const authState = {
  user: {
    name: 'Amina Kariuki',
    ambassador_profile: { id: 'amb-1' },
    permissions: ['check_ins:create', 'tasks:read', 'payout_requests:create', 'leaderboard:read', 'learning_resources:read'],
  },
}

const permissionState = {
  checkPermission: vi.fn((permission: string) => authState.user.permissions.includes(permission)),
  checkRole: vi.fn(() => false),
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

    if (key === 'wallet') {
      return {
        data: { current_balance: 1250, available_balance: 1000 },
      }
    }

    if (key === 'my-profile') {
      return {
        data: { referral_code: 'AMINA123' },
      }
    }

    if (key === 'platforms') {
      return {
        data: [
          { id: 'platform-1', display_name: 'TikTok', referral_url_template: 'https://example.com/?ref={referral_code}', is_active: true },
        ],
      }
    }

    if (key === 'tasks') {
      return {
        data: [
          { id: 'task-1', title: 'Visit a shop', reward_points: 50, platform: { displayName: 'TikTok' }, status: { name: 'active' } },
        ],
      }
    }

    if (key === 'submissions') {
      return {
        data: [
          {
            created_at: '2026-05-29T08:00:00.000Z',
            task: { title: 'Visit a shop' },
            status: { name: 'approved', display_name: 'Approved' },
          },
        ],
      }
    }

    if (key === 'payouts') {
      return {
        data: [
          { created_at: '2026-05-29T09:00:00.000Z', amount: 500, status: { name: 'pending' } },
        ],
      }
    }

    if (key === 'checkins') {
      return {
        data: [
          { check_in_time: '2026-05-29T10:00:00.000Z', hub: { name: 'Main Hub' } },
        ],
      }
    }

    if (key === 'announcements') {
      return {
        data: [
          { id: 'ann-1', title: 'Welcome', content: 'Use the new dashboard tools', created_at: '2026-05-29T11:00:00.000Z' },
        ],
      }
    }

    if (key === 'analytics') {
      return {
        data: { totalLeads: 7, totalReferrals: 3 },
      }
    }

    return { data: [] }
  },
}))

describe('Dashboard', () => {
  const writeTextMock = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    writeTextMock.mockClear()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: writeTextMock }, configurable: true })
  })

  it('renders the main dashboard sections and quick actions', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Good (morning|afternoon|evening), Amina!/i)
    expect(screen.getByText('KES 1,250')).toBeInTheDocument()
    expect(screen.getAllByText('AMINA123').length).toBeGreaterThan(0)
    expect(screen.getByText('Visit a shop')).toBeInTheDocument()
    expect(screen.getByText('Welcome')).toBeInTheDocument()
    expect(screen.getByText('Check-in at Hub')).toBeInTheDocument()
    expect(screen.getByText('Learning Hub')).toBeInTheDocument()
    expect(screen.getByText('Share Your Referral Links')).toBeInTheDocument()
    expect(screen.getByText('https://example.com/?ref=AMINA123')).toBeInTheDocument()
  })

  it('lets the ambassador select a platform link and copy the selected links', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    expect(screen.getByText('Select all')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('checkbox')[1])
    expect(screen.getByText('1 selected')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Copy Selected'))
    expect(writeTextMock).toHaveBeenCalledWith('https://example.com/?ref=AMINA123')
  })
})
