import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ForgotPasswordPage from './ForgotPasswordPage'

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  forgotPassword: vi.fn(),
}))

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ toast: mocks.toast }),
}))

vi.mock('../services/api', () => ({
  authAPI: {
    forgotPassword: mocks.forgotPassword,
  },
}))

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    mocks.toast.mockReset()
    mocks.forgotPassword.mockReset()
  })

  it('validates email before submitting', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(mocks.forgotPassword).not.toHaveBeenCalled()
  })

  it('submits a reset request and shows confirmation state', async () => {
    const user = userEvent.setup()
    mocks.forgotPassword.mockResolvedValueOnce({})

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    )

    await user.type(screen.getByPlaceholderText('you@example.com'), 'amina@example.com')
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    expect(mocks.forgotPassword).toHaveBeenCalledWith('amina@example.com')
    expect(await screen.findByText('Check Your Email')).toBeInTheDocument()
  })
})
