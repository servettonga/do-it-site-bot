import { cn } from '@/lib/utils';

interface BookPlaceholderProps {
  title: string;
  author: string;
  className?: string;
}

// Generate a consistent color based on book title
export const getPlaceholderColor = (title: string) => {
  const colors = [
    'bg-rose-600', 'bg-amber-600', 'bg-emerald-600', 'bg-cyan-600',
    'bg-violet-600', 'bg-pink-600', 'bg-indigo-600', 'bg-teal-600'
  ];
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export function BookPlaceholder({ title, author, className }: BookPlaceholderProps) {
  return (
    <div className={cn(
      "h-full w-full flex flex-col items-center justify-center p-3 text-white",
      getPlaceholderColor(title),
      className
    )}>
      <p className="font-display font-bold text-center text-sm leading-tight line-clamp-3 mb-1">
        {title}
      </p>
      <p className="text-xs text-white/80 text-center line-clamp-2">
        {author}
      </p>
    </div>
  );
}
