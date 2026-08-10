export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'loading-sm', md: '', lg: 'loading-lg' };
  return <span className={`loading loading-spinner ${sizes[size]}`} />;
}
