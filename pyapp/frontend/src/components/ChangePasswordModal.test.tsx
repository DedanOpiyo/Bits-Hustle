import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ChangePasswordModal from './ChangePasswordModal'

describe('ChangePasswordModal', () => {
  it('validates password length and confirmation', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<ChangePasswordModal onSubmit={onSubmit} requireCurrent />)

    const inputs = document.querySelectorAll('input')
    await user.type(inputs[0], 'oldpass')
    await user.type(inputs[1], '123')
    await user.type(inputs[2], '1234')
    await user.click(screen.getByRole('button', { name: 'Change Password' }))

    expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the new password when validation passes', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<ChangePasswordModal onSubmit={onSubmit} requireCurrent={false} />)

    const inputs = document.querySelectorAll('input')
    await user.type(inputs[0], 'secret123')
    await user.type(inputs[1], 'secret123')
    await user.click(screen.getByRole('button', { name: 'Set Password & Continue' }))

    expect(onSubmit).toHaveBeenCalledWith({
      currentPassword: '',
      newPassword: 'secret123',
    })
  })
})
