import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LearningHubPage from './LearningHubPage'

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  createResource: vi.fn(),
}))

const authState = {
  user: { id: 'user-1', permissions: ['learning_resources:read', 'learning_resources:create'] },
}

const permissionState = {
  checkPermission: vi.fn((permission: string) => authState.user.permissions.includes(permission)),
}

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../hooks/usePermissions', () => ({
  usePermissions: () => permissionState,
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      {
        id: 'res-1',
        title: 'Sales Script 101',
        description: 'A starter sales script',
        category: 'Sales',
        type: 'script',
        url: 'https://example.com/script',
        tags: 'sales,starter',
      },
    ],
    isLoading: false,
    error: null,
  }),
  useMutation: () => ({
    mutateAsync: mocks.createResource,
    isPending: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
  }),
}))

vi.mock('../services/api', () => ({
  learningResourceAPI: {
    getResources: vi.fn(),
    createResource: mocks.createResource,
  },
}))

describe('LearningHubPage', () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockReset()
    mocks.createResource.mockReset()
    permissionState.checkPermission.mockImplementation((permission: string) => authState.user.permissions.includes(permission))
  })

  it('renders learning resources and the creation form', () => {
    render(<LearningHubPage />)

    expect(screen.getByText('Learning Hub')).toBeInTheDocument()
    expect(screen.getByText('Sales Script 101')).toBeInTheDocument()
    expect(screen.getByText('A starter sales script')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open/i })).toBeInTheDocument()
    expect(screen.getByText('Add New Learning Resource')).toBeInTheDocument()
  })

  it('submits a new resource from the form', async () => {
    const user = userEvent.setup()
    const { container } = render(<LearningHubPage />)
    const inputs = container.querySelectorAll('input')
    const selects = container.querySelectorAll('select')

    await user.type(inputs[0], 'Guide to Sales')
    await user.selectOptions(selects[0], 'Sales')
    await user.selectOptions(selects[1], 'script')
    await user.type(inputs[1], 'https://example.com/guide')
    await user.click(screen.getByRole('button', { name: 'Add Resource' }))

    expect(mocks.createResource).toHaveBeenCalledWith({
      title: 'Guide to Sales',
      description: '',
      category: 'Sales',
      type: 'script',
      url: 'https://example.com/guide',
      thumbnailUrl: '',
      tags: '',
      isActive: true,
    })
  })
})
