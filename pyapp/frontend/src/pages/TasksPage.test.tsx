import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TasksPage from './TasksPage'

const navigate = vi.fn()
const invalidateQueries = vi.fn()
const deleteTaskMutate = vi.fn()

const authState = {
  user: {
    ambassador_profile: { id: 'amb-1' },
  },
}

const permissionState = {
  checkPermission: vi.fn((permission: string) => permission !== 'tasks:create'),
  checkRole: vi.fn((role: string) => role === 'SUPER_ADMIN' ? false : false),
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
    useNavigate: () => navigate,
  }
})

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'tasks') {
      return {
        data: [
          { id: 'task-1', description: 'First task description', platform: { display_name: 'TikTok' }, reward: 2500 },
          { id: 'task-2', description: 'Second task description', platform: { display_name: 'Instagram' }, reward: 1000 },
        ],
        isLoading: false,
        error: null,
      }
    }

    if (queryKey[0] === 'ambassadorSubmissions') {
      return {
        data: [
          {
            task_id: 'task-2',
            status: { name: 'rejected', display_name: 'Rejected' },
            reviewed_at: '2026-05-29T00:00:00.000Z',
          },
        ],
        isLoading: false,
        error: null,
      }
    }

    return { data: [], isLoading: false, error: null }
  },
  useMutation: () => ({
    mutate: deleteTaskMutate,
    mutateAsync: deleteTaskMutate,
    isPending: false,
  }),
  useQueryClient: () => ({
    invalidateQueries,
  }),
}))

describe('TasksPage', () => {
  beforeEach(() => {
    navigate.mockReset()
    invalidateQueries.mockReset()
    deleteTaskMutate.mockReset()
    permissionState.checkPermission.mockImplementation((permission: string) => permission !== 'tasks:create')
    permissionState.checkRole.mockReturnValue(false)
  })

  it('shows ambassador actions for tasks with and without submissions', () => {
    render(<TasksPage />)

    expect(screen.getByText('Available Tasks')).toBeInTheDocument()
    expect(screen.getAllByText('Submit Proof')).toHaveLength(1)
    expect(screen.getByText('Resubmit')).toBeInTheDocument()
    expect(screen.queryByText('Create Task')).not.toBeInTheDocument()
  })

  it('blocks users without task permissions', () => {
    permissionState.checkPermission.mockReturnValue(false)

    render(<TasksPage />)

    expect(screen.getByText("You don't have permission to view tasks")).toBeInTheDocument()
  })
})
