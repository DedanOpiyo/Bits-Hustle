import { type ChangeEvent, type InputHTMLAttributes, useState } from 'react';
import { cn } from '../utils';
import { Icon } from './Icon';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  error?: string;
}

export default function PasswordInput({
  error,
  className,
  onChange,
  disabled,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
  };

  return (
    <div className="relative">
      <input
        {...props}
        type={showPassword ? 'text' : 'password'}
        onChange={handleChange}
        className={cn('input input-bordered w-full pr-12', error ? 'input-error' : '', className)}
      />
      <button
        type="button"
        className="btn btn-ghost btn-sm absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
        onClick={() => setShowPassword((value) => !value)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        aria-pressed={showPassword}
        disabled={disabled}
      >
        <Icon name={showPassword ? 'eyeOff' : 'eye'} className="h-4 w-4" />
      </button>
    </div>
  );
}
