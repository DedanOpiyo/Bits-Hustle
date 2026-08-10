import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TaskReviewPage from './TaskReviewPage'

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  reviewSubmission: vi.fn(),
}))

const authState = {
  user: { id: 'user-1' },
}

const permissionState = {
  checkPermission: vi.fn((permission: string) => permission === 'hub_manager:access'),
  checkRole: vi.fn((role: string) => role === 'SUPER_ADMIN'),
}

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../hooks/usePermissions', () => ({
  usePermissions: () => permissionState,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ taskId: 'task-1' }),
  }
})

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'task') {
      return {
        data: {
          id: 'task-1',
          description: 'Review the campaign proof',
          reward: 1000,
          platform: { display_name: 'TikTok' },
          deadline: '2026-06-05T00:00:00.000Z',
        },
        isLoading: false,
        error: null,
      }
    }

    if (queryKey[0] === 'taskSubmissions') {
      return {
        data: {
          items: [
            {
              id: 'sub-1',
              task_id: 'task-1',
              created_at: '2026-05-29T12:00:00.000Z',
              proof_url: 'https://example.com/proof.jpg',
              description: 'Submitted proof',
              status: { name: 'SUBMITTED', display_name: 'Submitted' },
              ambassador: { user: { name: 'Amina' } },
            },
          ],
        },
        isLoading: false,
        error: null,
      }
    }

    return { data: null, isLoading: false, error: null }
  },
  useMutation: () => ({
    mutateAsync: mocks.reviewSubmission,
    isPending: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
  }),
}))

vi.mock('../services/api', () => ({
  taskAPI: {
    getTask: vi.fn(),
    reviewSubmission: mocks.reviewSubmission,
  },
  default: {
    get: vi.fn(),
  },
}))

describe('TaskReviewPage', () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockReset()
    mocks.reviewSubmission.mockReset()
    permissionState.checkPermission.mockImplementation((permission: string) => permission === 'hub_manager:access')
    permissionState.checkRole.mockImplementation((role: string) => role === 'SUPER_ADMIN')
  })

  it('renders a reviewable submission', () => {
    render(<TaskReviewPage />)

    expect(screen.getByText('Task Submission Review')).toBeInTheDocument()
    expect(screen.getAllByText('Review the campaign proof').length).toBeGreaterThan(0)
    expect(screen.getByText('Submission by Amina')).toBeInTheDocument()
    expect(screen.getByText('Proof URL: https://example.com/proof.jpg')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument()
  })

  it('blocks users without review permission', () => {
    permissionState.checkPermission.mockReturnValue(false)
    permissionState.checkRole.mockReturnValue(false)

    render(<TaskReviewPage />)

    expect(screen.getByText("You don't have permission to review task submissions")).toBeInTheDocument()
  })

  it('starts a review action', async () => {
    const user = userEvent.setup()

    render(<TaskReviewPage />)

    await user.click(screen.getByRole('button', { name: 'Approve' }))
    await user.click(screen.getByRole('button', { name: /Confirm Approval/i }))

    expect(mocks.reviewSubmission).toHaveBeenCalled()
  })
})
