interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className = "" }: ErrorMessageProps) {
  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 ${className}`.trim()}
      role="alert"
    >
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
