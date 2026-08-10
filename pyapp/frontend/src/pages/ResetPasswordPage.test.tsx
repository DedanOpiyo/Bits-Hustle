import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ResetPasswordPage from './ResetPasswordPage'

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  resetPassword: vi.fn(),
}))

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ toast: mocks.toast }),
}))

vi.mock('../services/api', () => ({
  authAPI: {
    resetPassword: mocks.resetPassword,
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams('token=abc123')],
  }
})

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    mocks.toast.mockReset()
    mocks.resetPassword.mockReset()
  })

  it('validates matching passwords before submitting', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ResetPasswordPage />
      </MemoryRouter>
    )

    await user.type(screen.getByPlaceholderText('At least 6 characters'), 'secret123')
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'different123')
    await user.click(screen.getByRole('button', { name: 'Reset Password' }))

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    expect(mocks.resetPassword).not.toHaveBeenCalled()
  })

  it('submits a reset request and shows the success state', async () => {
    const user = userEvent.setup()
    mocks.resetPassword.mockResolvedValueOnce({})

    render(
      <MemoryRouter>
        <ResetPasswordPage />
      </MemoryRouter>
    )

    await user.type(screen.getByPlaceholderText('At least 6 characters'), 'secret123')
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Reset Password' }))

    expect(mocks.resetPassword).toHaveBeenCalledWith('abc123', 'secret123')
    await waitFor(() => expect(screen.getByText('Password Reset Complete')).toBeInTheDocument())
  })
})
