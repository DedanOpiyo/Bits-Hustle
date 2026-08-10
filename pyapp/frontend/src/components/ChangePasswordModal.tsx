import { useState, type FormEvent } from "react";
import PasswordInput from "./PasswordInput";

interface ChangePasswordModalProps {
  onSubmit: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  requireCurrent?: boolean;
}

export default function ChangePasswordModal({ onSubmit, requireCurrent = true }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        currentPassword: requireCurrent ? currentPassword : "",
        newPassword,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string; error?: string } } }).response;
        setError(response?.data?.message || response?.data?.error || 'Failed to change password');
      } else {
        setError('Failed to change password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title mb-2">
            {requireCurrent ? "Change Password" : "Set Your Password"}
          </h2>
          <p className="text-base-content/70 text-sm mb-4">
            {requireCurrent
              ? "Enter your current password and choose a new one."
              : "You must change your temporary password before continuing."}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {requireCurrent && (
              <div>
                <label className="label">
                  <span className="label-text">Current Password</span>
                </label>
                <PasswordInput
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required={requireCurrent}
                />
              </div>
            )}

            <div>
              <label className="label">
                <span className="label-text">New Password</span>
              </label>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Confirm Password</span>
              </label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && <div className="text-error text-sm">{error}</div>}

            <div className="card-actions justify-end">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading && <span className="loading loading-spinner loading-sm mr-1" />}
                {requireCurrent ? "Change Password" : "Set Password & Continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
