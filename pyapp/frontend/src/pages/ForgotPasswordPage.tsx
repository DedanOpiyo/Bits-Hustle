import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { authAPI } from '../services/api';
import SEO from '../components/SEO';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [formState, setFormState] = useState({
    email: '',
    emailError: '',
    submitting: false,
    submitted: false,
  });

  const validateEmail = (email: string) =>
    !email ? 'Email is required' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Please enter a valid email';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
      [`${name}Error`]: name === 'email' ? validateEmail(value) : '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail(formState.email);
    if (emailError) return setFormState((p) => ({ ...p, emailError }));
    setFormState((p) => ({ ...p, submitting: true }));
    try {
      await authAPI.forgotPassword(formState.email);
      setFormState((p) => ({ ...p, submitted: true }));
      toast('Password reset link sent to your email', 'success');
    } catch (err: unknown) {
      let msg = 'Failed to send reset link. Please try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const r = (err as { response?: { data?: { message?: string; error?: string } } }).response;
        msg = r?.data?.message || r?.data?.error || msg;
      } else if (err instanceof Error) msg = err.message;
      toast(msg, 'error');
      setFormState((p) => ({ ...p, submitting: false }));
    }
  };

  if (formState.submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-300 p-4">
        <SEO title="Check Your Email" description="Password reset link sent. Check your email to reset your Bits Hustle Hub password." />
        <div className="card bg-base-100 border border-base-300 shadow-2xl w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">Check Your Email</h1>
          <p className="text-base-content/60 mb-6">
            If an account exists with that email, we've sent you a password reset link.
            The link is valid for 1 hour.
          </p>
          <Link to="/login" className="btn btn-primary w-full">Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-300 p-4">
      <SEO
        title="Reset Password"
        description="Enter your email to receive a secure password reset link for your Bits Hustle Hub account."
      />
      <div className="card bg-base-100 border border-base-300 shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Bits Hustle Hub</h1>
          <p className="text-base-content/60">Reset your password</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label className="label">
              <span className="label-text font-medium">Email</span>
            </label>
            <input
              type="email"
              name="email"
              value={formState.email}
              onChange={handleChange}
              className={`input input-bordered w-full ${formState.emailError ? 'input-error' : ''}`}
              placeholder="you@example.com"
            />
            {formState.emailError && <p className="text-error text-sm mt-1">{formState.emailError}</p>}
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={formState.submitting}>
            {formState.submitting ? <span className="loading loading-spinner loading-sm" /> : 'Send Reset Link'}
          </button>
          <p className="text-center text-sm text-base-content/60">
            Remember your password?{' '}
            <Link to="/login" className="link link-primary font-medium">Login here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}