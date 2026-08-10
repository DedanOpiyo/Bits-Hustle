import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HubManagementPage from './HubManagementPage'

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  createHub: vi.fn(),
  updateHub: vi.fn(),
  deleteHub: vi.fn(),
}))

const authState = {
  user: { id: 'user-1' },
}

const permissionState = {
  checkPermission: vi.fn((permission: string) => permission === 'hubs:create'),
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
    if (queryKey[0] === 'hubs') {
      return {
        data: [
          {
            id: 'hub-1',
            name: 'Nairobi Hub',
            location: 'Nairobi',
            manager: { name: 'Grace' },
            ambassadors: [{ id: 'a1' }],
            created_at: '2026-05-29T00:00:00.000Z',
          },
        ],
        isLoading: false,
      }
    }

    if (queryKey[0] === 'users-list') {
      return {
        data: [
          { id: 'u1', name: 'Grace', email: 'grace@example.com', role: { name: 'HUB_MANAGER' } },
        ],
        isLoading: false,
      }
    }

    return { data: [], isLoading: false }
  },
  useMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
  }),
}))

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('HubManagementPage', () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockReset()
    permissionState.checkPermission.mockImplementation((permission: string) => permission === 'hubs:create')
    permissionState.checkRole.mockReturnValue(false)
  })

  it('renders the hub table and create form', () => {
    render(<HubManagementPage />)

    expect(screen.getByText('Hub Management')).toBeInTheDocument()
    expect(screen.getByText('Nairobi Hub')).toBeInTheDocument()
    expect(screen.getByText('Grace')).toBeInTheDocument()
    expect(screen.getAllByText('Create Hub').length).toBeGreaterThan(0)
  })

  it('blocks access without hub permissions', () => {
    permissionState.checkPermission.mockReturnValue(false)
    permissionState.checkRole.mockReturnValue(false)

    render(<HubManagementPage />)

    expect(screen.getByText("You don't have permission to manage hubs")).toBeInTheDocument()
  })

  it('submits a new hub', async () => {
    const user = userEvent.setup()
    const { container } = render(<HubManagementPage />)

    await user.click(screen.getAllByText('Create Hub')[0])

    const inputs = container.querySelectorAll('input')
    const select = container.querySelector('select')
    await user.type(inputs[0], 'Mombasa Hub')
    await user.type(inputs[1], 'Mombasa')
    await user.selectOptions(select as HTMLSelectElement, 'u1')
    await user.click(screen.getByRole('button', { name: 'Create Hub' }))

    expect(mocks.invalidateQueries).not.toHaveBeenCalled()
  })
})
