import { render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TaskSubmissionPage from './TaskSubmissionPage'

const navigate = vi.fn()
const invalidateQueries = vi.fn()
const submitTaskMutate = vi.fn()

const authState = {
  user: {
    ambassador_profile: { id: 'amb-1' },
  },
}

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({ taskId: 'task-1' }),
  }
})

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'task') {
      return {
        data: {
          id: 'task-1',
          description: 'Promote the platform',
          reward: 750,
          platform: { display_name: 'TikTok' },
          deadline: '2026-06-01T00:00:00.000Z',
        },
        isLoading: false,
        error: null,
      }
    }

    if (queryKey[0] === 'ambassador') {
      return {
        data: { id: 'amb-1', name: 'Amina' },
        isLoading: false,
        error: null,
      }
    }

    return { data: null, isLoading: false, error: null }
  },
  useMutation: () => ({
    mutateAsync: submitTaskMutate,
    isPending: false,
  }),
  useQueryClient: () => ({
    invalidateQueries,
  }),
}))

vi.mock('../services/api', () => ({
  taskAPI: {
    getTask: vi.fn(),
  },
  ambassadorAPI: {
    getAmbassador: vi.fn(),
  },
  default: {
    post: vi.fn(),
  },
}))

describe('TaskSubmissionPage', () => {
  beforeEach(() => {
    navigate.mockReset()
    invalidateQueries.mockReset()
    submitTaskMutate.mockReset()
  })

  it('requires a proof URL before submitting', async () => {
    render(<TaskSubmissionPage />)

    fireEvent.submit(screen.getByRole('button', { name: 'Submit Proof' }).closest('form')!)
    expect(screen.getByText('Proof file or URL is required')).toBeInTheDocument()
    expect(submitTaskMutate).not.toHaveBeenCalled()
  })

  it('submits proof when a URL is provided', async () => {
    const user = userEvent.setup()
    submitTaskMutate.mockResolvedValueOnce({})

    render(<TaskSubmissionPage />)

    await user.type(screen.getByPlaceholderText('Paste URL to proof if you are not uploading a file'), 'https://example.com/proof.jpg')
    await user.click(screen.getByRole('button', { name: 'Submit Proof' }))

    expect(submitTaskMutate).toHaveBeenCalledWith({
      taskId: 'task-1',
      proofUrl: 'https://example.com/proof.jpg',
    })
  })
})
