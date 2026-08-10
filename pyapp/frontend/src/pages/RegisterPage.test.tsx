import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RegisterPage from './RegisterPage'

const register = vi.fn()
const toast = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    register,
  }),
}))

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ toast }),
}))

vi.mock('../services/api', () => ({
  hubAPI: {
    getPublicHubs: vi.fn().mockResolvedValue({
      data: {
        items: [
          { id: 'hub-1', name: 'Nairobi Hub' },
        ],
      },
    }),
  },
}))

describe('RegisterPage', () => {
  beforeEach(() => {
    register.mockReset()
    toast.mockReset()
  })

  it('shows validation errors when required fields are missing', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Phone number is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(screen.getByText('Campus/Hub selection is required')).toBeInTheDocument()
  })

  it('submits registration data and shows the success state', async () => {
    const user = userEvent.setup()
    register.mockResolvedValueOnce({})

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    )

    await user.type(screen.getByPlaceholderText('John Doe'), 'Amina Kariuki')
    await user.type(screen.getByPlaceholderText('you@example.com'), 'amina@example.com')
    await user.type(screen.getByPlaceholderText('0712345678'), '0712345678')
    await user.type(screen.getByPlaceholderText('At least 6 characters'), 'secret123')
    await waitFor(() => expect(screen.getByText('Nairobi Hub')).toBeInTheDocument())
    await user.selectOptions(screen.getByRole('combobox'), 'hub-1')
    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(register).toHaveBeenCalledWith({
      email: 'amina@example.com',
      password: 'secret123',
      name: 'Amina Kariuki',
      phoneNumber: '0712345678',
      hubId: 'hub-1',
    })

    await waitFor(() => expect(screen.getByText('Registration Submitted')).toBeInTheDocument())
  })
})
