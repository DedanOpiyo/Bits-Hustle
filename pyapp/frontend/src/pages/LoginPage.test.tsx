import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'

const navigate = vi.fn()
const login = vi.fn()
const toast = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login,
    user: null,
    showPasswordChange: false,
    changePassword: vi.fn(),
  }),
}))

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ toast }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('../components/ChangePasswordModal', () => ({
  default: () => null,
}))

describe('LoginPage', () => {
  beforeEach(() => {
    navigate.mockReset()
    login.mockReset()
    toast.mockReset()
  })

  it('shows validation errors when required fields are missing', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('submits valid credentials to the auth login function', async () => {
    const user = userEvent.setup()
    login.mockResolvedValueOnce({})

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    await user.type(screen.getByPlaceholderText('you@example.com'), 'sam@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(login).toHaveBeenCalledWith('sam@example.com', 'secret123')
  })
})
