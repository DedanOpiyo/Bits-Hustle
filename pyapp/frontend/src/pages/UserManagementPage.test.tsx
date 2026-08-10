import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UserManagementPage from './UserManagementPage'

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  activateUser: vi.fn(),
  deactivateUser: vi.fn(),
}))

const authState = {
  user: { id: 'user-1' },
}

const permissionState = {
  checkRole: vi.fn((role: string) => role === 'SUPER_ADMIN'),
}

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../hooks/usePermissions', () => ({
  usePermissions: () => permissionState,
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'admin-users') {
      return {
        data: [
          {
            id: 'u1',
            name: 'Grace',
            email: 'grace@example.com',
            role: { display_name: 'Hub Manager' },
            phone_number: '0712345678',
            is_active: true,
          },
        ],
        isLoading: false,
      }
    }

    if (queryKey[0] === 'role-types') {
      return {
        data: [
          { id: 'r1', display_name: 'Hub Manager' },
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

describe('UserManagementPage', () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockReset()
    permissionState.checkRole.mockImplementation((role: string) => role === 'SUPER_ADMIN')
  })

  it('renders users and the creation form', () => {
    render(<UserManagementPage />)

    expect(screen.getByText('User Management')).toBeInTheDocument()
    expect(screen.getByText('Grace')).toBeInTheDocument()
    expect(screen.getByText('grace@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('Hub Manager').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Create User').length).toBeGreaterThan(0)
  })

  it('blocks non-admin users', () => {
    permissionState.checkRole.mockReturnValue(false)

    render(<UserManagementPage />)

    expect(screen.getByText('Only Super Admins can manage users')).toBeInTheDocument()
  })

  it('submits a new user', async () => {
    const user = userEvent.setup()
    const { container } = render(<UserManagementPage />)

    await user.click(screen.getAllByText('Create User')[0])

    const inputs = container.querySelectorAll('input')
    const select = container.querySelector('select')
    await user.type(inputs[0], 'New Person')
    await user.type(inputs[1], 'new@example.com')
    await user.selectOptions(select as HTMLSelectElement, 'r1')
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    expect(mocks.invalidateQueries).not.toHaveBeenCalled()
  })
})
