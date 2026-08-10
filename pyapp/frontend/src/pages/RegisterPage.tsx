import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { Icon } from '../components/Icon';
import PasswordInput from '../components/PasswordInput';
import { hubAPI } from '../services/api';
import SEO from '../components/SEO';

export default function RegisterPage() {
  const { register } = useAuth();
  const { toast } = useToast();
  const [formState, setFormState] = useState({
    email: '',
    password: '',
    name: '',
    phoneNumber: '',
    hubId: '',
    emailError: '',
    passwordError: '',
    nameError: '',
    phoneError: '',
    hubError: '',
    submitting: false,
    submitted: false,
  });
  const [hubs, setHubs] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hubsResp = await hubAPI.getPublicHubs();
        const hubsData = hubsResp.data?.items || [];
        setHubs(hubsData);
      } catch (err) {
        console.error('Failed to load hubs', err);
      }
    };
    fetchData();
  }, []);

  const validateEmail = (email: string) =>
    !email ? 'Email is required' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Please enter a valid email';
  const validatePassword = (pw: string) =>
    !pw ? 'Password is required' : pw.length < 6 ? 'Password must be at least 6 characters' : '';
  const validateName = (name: string) => (!name ? 'Name is required' : name.length < 2 ? 'Name must be at least 2 characters' : '');
  const validatePhone = (phone: string) => (!phone ? 'Phone number is required' : phone.length < 10 ? 'Phone number must be at least 10 digits' : '');
  const validateHub = (hubId: string) => (!hubId ? 'Campus/Hub selection is required' : '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let error = '';
    switch (name) {
      case 'email': error = validateEmail(value); break;
      case 'password': error = validatePassword(value); break;
      case 'name': error = validateName(value); break;
      case 'phoneNumber': error = validatePhone(value); break;
      case 'hubId': error = validateHub(value); break;
    }
    setFormState((p) => ({ ...p, [name]: value, [`${name}Error`]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = {
      emailError: validateEmail(formState.email),
      passwordError: validatePassword(formState.password),
      nameError: validateName(formState.name),
      phoneError: validatePhone(formState.phoneNumber),
      hubError: validateHub(formState.hubId),
    };
    if (Object.values(errors).some(Boolean)) return setFormState((p) => ({ ...p, ...errors }));
    setFormState((p) => ({ ...p, submitting: true }));
     try {
       await register({
         email: formState.email,
         password: formState.password,
         name: formState.name,
         phoneNumber: formState.phoneNumber,
         hubId: formState.hubId,
       });
       setFormState((p) => ({ ...p, submitted: true, submitting: false }));
       toast('Registration successful!', 'success');
     } catch (err: unknown) {
      let msg = 'Registration failed. Please try again.';
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
        <div className="card bg-base-100 border border-base-300 shadow-2xl w-full max-w-lg p-8 text-center">
          <div className="text-6xl mb-4"><Icon name="register" className="w-16 h-16 mx-auto" /></div>
          <h1 className="text-2xl font-bold text-primary mb-2">Registration Submitted</h1>
          <p className="text-base-content/60 mb-6">
            Your account has been created and is pending admin approval.
            You will receive a notification once your account is activated.
          </p>
          <Link to="/login" className="btn btn-primary w-full">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-300 p-4">
      <SEO
        title="Create Account"
        description="Register for a Bits Hustle Hub account. Join our managed assignment platform and connect with vetted specialists for professional project delivery."
      />
      <div className="card bg-base-100 border border-base-300 shadow-2xl w-full max-w-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Bits Hustle Hub</h1>
          <p className="text-base-content/60">Create your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label className="label"><span className="label-text font-medium">Full Name</span></label>
            <input name="name" type="text" value={formState.name} onChange={handleChange}
              className={`input input-bordered w-full ${formState.nameError ? 'input-error' : ''}`} placeholder="John Doe" />
            {formState.nameError && <p className="text-error text-sm mt-1">{formState.nameError}</p>}
          </div>
          <div>
            <label className="label"><span className="label-text font-medium">Email</span></label>
            <input name="email" type="email" value={formState.email} onChange={handleChange}
              className={`input input-bordered w-full ${formState.emailError ? 'input-error' : ''}`} placeholder="you@example.com" />
            {formState.emailError && <p className="text-error text-sm mt-1">{formState.emailError}</p>}
          </div>
          <div>
            <label className="label"><span className="label-text font-medium">Phone Number</span></label>
            <input name="phoneNumber" type="tel" value={formState.phoneNumber} onChange={handleChange}
              className={`input input-bordered w-full ${formState.phoneError ? 'input-error' : ''}`} placeholder="0712345678" />
            {formState.phoneError && <p className="text-error text-sm mt-1">{formState.phoneError}</p>}
          </div>
          <div>
            <label className="label"><span className="label-text font-medium">Password</span></label>
            <PasswordInput name="password" value={formState.password} onChange={handleChange}
              className={formState.passwordError ? 'input-error' : ''} placeholder="At least 6 characters"
              autoComplete="new-password" />
            {formState.passwordError && <p className="text-error text-sm mt-1">{formState.passwordError}</p>}
          </div>
          <div>
            <label className="label"><span className="label-text font-medium">Campus/Hub</span></label>
            <select name="hubId" value={formState.hubId} onChange={handleChange}
              className={`select select-bordered w-full ${formState.hubError ? 'select-error' : ''}`}>
              <option value="">Select your campus/hub</option>
              {hubs.map((hub) => (
                <option key={hub.id} value={hub.id}>{hub.name}</option>
              ))}
            </select>
            {formState.hubError && <p className="text-error text-sm mt-1">{formState.hubError}</p>}
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={formState.submitting}>
            {formState.submitting ? <span className="loading loading-spinner loading-sm" /> : 'Register'}
          </button>
          <p className="text-center text-sm text-base-content/60">
            Already have an account?{' '}
            <Link to="/login" className="link link-primary font-medium">Login here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
