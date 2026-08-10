import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import TaskViewPage from './TaskViewPage'

const navigate = vi.fn()

const useAuthMock = vi.hoisted(() => vi.fn())

vi.mock('../contexts/AuthContext', () => ({
  useAuth: useAuthMock,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({ taskId: 'task-1' }),
  }
})

vi.mock('../constants/platforms', () => ({
  usePlatforms: () => ({
    data: [
      { id: 'platform-1', displayName: 'TikTok' },
    ],
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: {
      description: 'Promote a new campaign',
      reward: 900,
      deadline: '2026-06-02T00:00:00.000Z',
      type: { display_name: 'Promo' },
      campaign: { name: 'June Launch' },
      platform_id: 'platform-1',
    },
    isLoading: false,
    error: null,
  }),
}))

vi.mock('../services/api', () => ({
  taskAPI: {
    getTask: vi.fn(),
  },
}))

describe('TaskViewPage', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' } })
  })

  it('renders task details with platform lookup and back navigation', () => {
    render(<TaskViewPage />)

    expect(screen.getByText('Task Details')).toBeInTheDocument()
    expect(screen.getByText('Promote a new campaign')).toBeInTheDocument()
    expect(screen.getByText('Reward: KES 900')).toBeInTheDocument()
    expect(screen.getByText('Platform: TikTok')).toBeInTheDocument()
    expect(screen.getByText('Type: Promo')).toBeInTheDocument()
    expect(screen.getByText('Campaign: June Launch')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to Tasks' })).toBeInTheDocument()
  })

  it('shows a login error for anonymous users', () => {
    useAuthMock.mockReturnValue({ user: null })

    render(<TaskViewPage />)

    expect(screen.getByText('You must be logged in to view this page')).toBeInTheDocument()
  })
})
