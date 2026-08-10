import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PartnerPortal from './PartnerPortal'

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  createCampaignMutation: vi.fn(),
  updateCampaignMutation: vi.fn(),
  deleteCampaignMutation: vi.fn(),
  reviewCampaignMutation: vi.fn(),
}))

const authState = {
  user: { id: 'user-1' },
}

const permissionState = {
  checkPermission: vi.fn((permission: string) =>
    ['campaigns:read', 'campaigns:create', 'campaigns:delete'].includes(permission),
  ),
}

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../hooks/usePermissions', () => ({
  usePermissions: () => permissionState,
}))

vi.mock('../constants/platforms', () => ({
  usePlatforms: () => ({
    data: [{ id: 'platform-1', displayName: 'TikTok' }],
    isLoading: false,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'campaigns') {
      return {
        data: [
          {
            id: 'camp-1',
            name: 'May Promo',
            description: 'Main campaign',
            platform: { display_name: 'TikTok' },
            budget: 20000,
            tasks: [{ id: 'task-1' }],
            leads: [{ id: 'lead-1' }],
            approval_status: 'PENDING',
            start_date: '2026-05-01T00:00:00.000Z',
            end_date: '2026-05-31T00:00:00.000Z',
            is_active: true,
          },
        ],
        isLoading: false,
        error: null,
      }
    }

    return { data: [], isLoading: false, error: null }
  },
  useMutation: () => ({
    mutateAsync: mocks.createCampaignMutation,
    mutate: mocks.createCampaignMutation,
    isPending: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
  }),
}))

vi.mock('../services/api', () => ({
  campaignAPI: {
    getCampaigns: vi.fn(),
    createCampaign: vi.fn(),
    updateCampaign: vi.fn(),
    deleteCampaign: vi.fn(),
    reviewCampaign: vi.fn(),
  },
}))

describe('PartnerPortal', () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockReset()
    mocks.createCampaignMutation.mockReset()
    mocks.updateCampaignMutation.mockReset()
    mocks.deleteCampaignMutation.mockReset()
    mocks.reviewCampaignMutation.mockReset()
    permissionState.checkPermission.mockImplementation((permission: string) =>
      ['campaigns:read', 'campaigns:create', 'campaigns:delete'].includes(permission),
    )
  })

  it('renders campaigns and the create campaign section', () => {
    render(<PartnerPortal />)

    expect(screen.getByText('Active Campaigns')).toBeInTheDocument()
    expect(screen.getByText('May Promo')).toBeInTheDocument()
    expect(screen.getAllByText('TikTok').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Create Campaign').length).toBeGreaterThan(0)
  })

  it('blocks access without campaign read permission', () => {
    permissionState.checkPermission.mockReturnValue(false)

    render(<PartnerPortal />)

    expect(screen.getByText("You don't have permission to view the partner portal")).toBeInTheDocument()
  })

  it('submits a new campaign', async () => {
    const user = userEvent.setup()
    const { container } = render(<PartnerPortal />)

    await user.click(screen.getAllByText('Create Campaign')[0])

    const inputs = container.querySelectorAll('input')
    const selects = container.querySelectorAll('select')
    const textareas = container.querySelectorAll('textarea')

    await user.type(inputs[0], 'June Promo')
    await user.type(textareas[0], 'Campaign description')
    await user.type(inputs[1], '2026-06-01')
    await user.type(inputs[2], '2026-06-30')
    await user.type(inputs[3], '15000')
    await user.selectOptions(selects[0], 'platform-1')
    await user.click(screen.getByRole('button', { name: 'Create Campaign' }))

    expect(mocks.createCampaignMutation).toHaveBeenCalledWith({
      name: 'June Promo',
      description: 'Campaign description',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      budget: 15000,
      platformId: 'platform-1',
    })
  })
})
