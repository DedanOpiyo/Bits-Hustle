import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import ChangePasswordModal from '../components/ChangePasswordModal';
import PasswordInput from '../components/PasswordInput';
import QRScanner from "../components/QRScanner";
import { Icon } from "../components/Icon";
import SEO from '../components/SEO';

const ROLE_REDIRECTS: Record<string, string> = {
  SUPER_ADMIN: '/dashboard',
  ADMIN: '/gig-management',
  HUB_MANAGER: '/hub-dashboard',
  FINANCE_OFFICER: '/finance',
  SUPPORT_OFFICER: '/support-tickets',
  CLIENT: '/assignments',
  GIG_WORKER: '/my-gigs',
  AMBASSADOR: '/dashboard',
};

function getPostLoginPath(user: { role?: { name?: string } | null; roles?: string[] } | null | undefined) {
  const roleName = user?.role?.name || user?.roles?.[0];
  return roleName && ROLE_REDIRECTS[roleName] ? ROLE_REDIRECTS[roleName] : '/dashboard';
}

export default function LoginPage() {
  const { login, user, showPasswordChange, changePassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [formState, setFormState] = useState({
    email: '',
    password: '',
    emailError: '',
    passwordError: '',
    submitting: false,
    justLoggedIn: false,
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [loginMethod, setLoginMethod] = useState<"password" | "qr">("password");

  useEffect(() => {
    if (formState.justLoggedIn && user && !showPasswordChange) {
      navigate(getPostLoginPath(user), { replace: true });
    }
  }, [formState.justLoggedIn, user, showPasswordChange, navigate]);

  useEffect(() => {
    if (loginMethod === "password") {
      setFormState({
        email: '',
        password: '',
        emailError: '',
        passwordError: '',
        submitting: false,
        justLoggedIn: false,
      });
    }
  }, [loginMethod]);

  const validateEmail = (email: string) =>
    !email ? 'Email is required' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Please enter a valid email';
  const validatePassword = (pw: string) =>
    !pw ? 'Password is required' : pw.length < 6 ? 'Password must be at least 6 characters' : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
      [`${name}Error`]: name === 'email' ? validateEmail(value) : name === 'password' ? validatePassword(value) : '',
    }));
  };

const handleScan = async (decodedText: string) => {
        if (!decodedText) return;
        setIsScanning(false);
        if (decodedText.startsWith("hub-")) {
          navigate(`/qr-checkin?hub=${decodedText.replace("hub-", "")}`);
        } else if (decodedText.startsWith("LOGIN://")) {
          const encoded = decodedText.substring(8); // Remove "LOGIN://"
          try {
              const binary = atob(encoded);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              const decoder = new TextDecoder();
              const str = decoder.decode(bytes);
              const credentials = JSON.parse(str);
              const { email, password } = credentials;
              if (email && password) {
                setFormState({
                  email,
                  password,
                  emailError: '',
                  passwordError: '',
                  submitting: false,
                  justLoggedIn: false,
                });
                // Attempt to log in with these credentials
                handleSubmit({
                  preventDefault() {},
                  stopPropagation() {},
                  persist() {},
                  isDefaultPrevented: () => false,
                  isPropagationStopped: () => false,
                  defaultPrevented: false,
                  target: { elements: { email: { value: email }, password: { value: password } } }
                } as unknown as React.FormEvent);
              } else {
                setScanError("Invalid login QR code format.");
              }
          } catch (e) {
            setScanError("Invalid login QR code.");
          }
        } else {
          setScanError("Invalid QR code. Please scan a valid hub QR.");
        }
      };

  const handleScannerError = (message: string) => {
    setScanError(message);
    setIsScanning(false);
  };

const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
      const email = formState.email.trim();
      const emailError = validateEmail(email);
      const passwordError = validatePassword(formState.password);
      if (emailError || passwordError) return setFormState((p) => ({ ...p, emailError, passwordError }));
      setFormState((p) => ({ ...p, submitting: true }));
      try {
        await login(email, formState.password);
        // Save credentials for QR login (per user)
        localStorage.setItem(`credentials:${email}`, JSON.stringify({ email, password: formState.password }));
        setFormState((p) => ({ ...p, justLoggedIn: true, submitting: false }));
       } catch (err: unknown) {
        let msg = 'Login failed. Please try again.';
        if (err && typeof err === 'object' && 'response' in err) {
          const r = (err as { response?: { data?: { message?: string; error?: string } } }).response;
          msg = r?.data?.message || r?.data?.error || msg;
        } else if (err instanceof Error) msg = err.message;
        alert(`Login failed. Email: ${formState.email}. Error: ${msg}`);
        toast(msg, 'error');
       }
     setFormState((p) => ({ ...p, submitting: false }));
   };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1920')] bg-cover bg-center">
      <SEO
        title="Sign In"
        description="Sign in to your Bits Hustle Hub account. Access your dashboard, manage assignments, track tasks, and view analytics."
      />
      <div className="absolute inset-0 bg-base-300/80 backdrop-blur-sm" />
      <div className="card bg-base-100 border border-base-300 shadow-2xl w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Bits Hustle Hub</h1>
          <p className="text-base-content/60">Welcome back – sign in to continue</p>
        </div>

        <div className="tabs tabs-boxed mb-4">
          <button
            type="button"
            className={`tab flex-1 ${loginMethod === "password" ? "tab-active" : ""}`}
            onClick={() => setLoginMethod("password")}
          >
            <Icon name="login" className="w-4 h-4 mr-1" />
            Password
          </button>
          <button
            type="button"
            className={`tab flex-1 ${loginMethod === "qr" ? "tab-active" : ""}`}
            onClick={() => {
              setScanError("");
              setLoginMethod("qr");
            }}
          >
            <Icon name="qr-code" className="w-4 h-4 mr-1" />
            Scan QR
          </button>
        </div>

        {loginMethod === "password" ? (
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
            <div>
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <PasswordInput
                name="password"
                value={formState.password}
                onChange={handleChange}
                className={formState.passwordError ? 'input-error' : ''}
                placeholder="••••••••"
              />
              {formState.passwordError && <p className="text-error text-sm mt-1">{formState.passwordError}</p>}
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={formState.submitting}>
              {formState.submitting ? <span className="loading loading-spinner loading-sm" /> : 'Login'}
            </button>
            <p className="text-center text-sm text-base-content/60">
              <Link to="/forgot-password" className="link link-primary font-medium">Forgot password?</Link>
            </p>
            <p className="text-center text-sm text-base-content/60">
              Don't have an account?{' '}
              <Link to="/register" className="link link-primary font-medium">Register here</Link>
            </p>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="relative bg-base-300 rounded-xl overflow-hidden aspect-square flex items-center justify-center">
              {isScanning ? (
                <QRScanner
                  scanning={isScanning}
                  onScan={handleScan}
                  onError={handleScannerError}
                  className="w-full h-full"
                />
              ) : (
                <div className="text-center text-base-content/40 p-8">
                  <Icon name="qr-code" className="w-16 h-16 mx-auto mb-2" />
                  <p>Camera is off</p>
                  <p className="text-sm mt-1">Click Start Scan to scan hub QR</p>
                </div>
              )}
            </div>
            {scanError && (
              <div className="alert alert-error">
                <Icon name="alert" className="w-4 h-4" />
                <span>{scanError}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                if (isScanning) {
                  setIsScanning(false);
                } else {
                  setScanError("");
                  setIsScanning(true);
                }
              }}
              className={`btn w-full ${isScanning ? "btn-secondary" : "btn-primary"}`}
            >
              {isScanning ? (
                <>
                  <Icon name="stop" className="w-4 h-4 mr-1" /> Stop Scan
                </>
              ) : (
                <>
                  <Icon name="play" className="w-4 h-4 mr-1" /> Start Scan
                </>
              )}
            </button>
            <p className="text-center text-sm text-base-content/60">
              Scan the QR code at your hub to check in automatically.
              <br />
              Alternatively, log in with email and password first.
            </p>
          </div>
        )}
      </div>

      {showPasswordChange && (
        <ChangePasswordModal
          requireCurrent={false}
          onSubmit={async (data) => {
            await changePassword(data);
            toast('Password changed successfully', 'success');
            navigate('/dashboard');
          }}
        />
      )}
    </div>
  );
}
