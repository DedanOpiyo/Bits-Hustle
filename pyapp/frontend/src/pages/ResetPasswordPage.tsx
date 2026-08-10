import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import PasswordInput from '../components/PasswordInput';
import { authAPI } from '../services/api';
import SEO from '../components/SEO';

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [formState, setFormState] = useState({
    password: '',
    confirmPassword: '',
    passwordError: '',
    confirmPasswordError: '',
    submitting: false,
    success: false,
  });

  useEffect(() => {
    if (!token) {
      toast('Invalid reset link: no token provided', 'error');
    }
  }, [token, toast]);

  const validatePassword = (pw: string) =>
    !pw ? 'Password is required' : pw.length < 6 ? 'Password must be at least 6 characters' : '';
  const validateConfirmPassword = (pw: string, confirm: string) =>
    !confirm ? 'Please confirm your password' : pw !== confirm ? 'Passwords do not match' : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let error = '';
    if (name === 'password') {
      error = validatePassword(value);
    } else if (name === 'confirmPassword') {
      error = validateConfirmPassword(formState.password, value);
    }
    setFormState((p) => ({ ...p, [name]: value, [`${name}Error`]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const errors = {
      passwordError: validatePassword(formState.password),
      confirmPasswordError: validateConfirmPassword(formState.password, formState.confirmPassword),
    };
    if (Object.values(errors).some(Boolean)) return setFormState((p) => ({ ...p, ...errors }));
    setFormState((p) => ({ ...p, submitting: true }));
    try {
      await authAPI.resetPassword(token, formState.password);
      setFormState((p) => ({ ...p, success: true }));
      toast('Password reset successful! You can now log in.', 'success');
    } catch (err: unknown) {
      let msg = 'Failed to reset password. Please try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const r = (err as { response?: { data?: { message?: string; error?: string } } }).response;
        msg = r?.data?.message || r?.data?.error || msg;
      } else if (err instanceof Error) msg = err.message;
      toast(msg, 'error');
      setFormState((p) => ({ ...p, submitting: false }));
    }
  };

  if (formState.success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-300 p-4">
        <SEO title="Password Reset Complete" description="Your password has been successfully reset. You can now log in with your new password." />
        <div className="card bg-base-100 border border-base-300 shadow-2xl w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">Password Reset Complete</h1>
          <p className="text-base-content/60 mb-6">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <Link to="/login" className="btn btn-primary w-full">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-300 p-4">
      <SEO title="Set New Password" description="Set your new Bits Hustle Hub password to regain access to your account." />
      <div className="card bg-base-100 border border-base-300 shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Bits Hustle Hub</h1>
          <p className="text-base-content/60">Set your new password</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label className="label">
              <span className="label-text font-medium">New Password</span>
            </label>
            <PasswordInput
              name="password"
              value={formState.password}
              onChange={handleChange}
              className={formState.passwordError ? 'input-error' : ''}
              placeholder="At least 6 characters"
            />
            {formState.passwordError && <p className="text-error text-sm mt-1">{formState.passwordError}</p>}
          </div>
          <div>
            <label className="label">
              <span className="label-text font-medium">Confirm Password</span>
            </label>
            <PasswordInput
              name="confirmPassword"
              value={formState.confirmPassword}
              onChange={handleChange}
              className={formState.confirmPasswordError ? 'input-error' : ''}
              placeholder="Confirm your password"
            />
            {formState.confirmPasswordError && <p className="text-error text-sm mt-1">{formState.confirmPasswordError}</p>}
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={formState.submitting || !token}>
            {formState.submitting ? <span className="loading loading-spinner loading-sm" /> : 'Reset Password'}
          </button>
          <p className="text-center text-sm text-base-content/60">
            <Link to="/login" className="link link-primary font-medium">Back to Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}