import { Heart } from 'lucide-react';

export function SupportButton() {
  const handleClick = () => {
    // Analytics tracking could be added here
    console.log('Support button clicked');
  };

  return (
    <a
      href="https://ko-fi.com/alexalmansa"
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      title="Support TrailReplay"
      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--trail-orange)] hover:bg-[var(--trail-orange)]/90 text-[var(--canvas)] rounded-lg transition-colors font-medium text-sm"
    >
      <Heart className="w-4 h-4 fill-current" />
      <span className="hidden sm:inline">Support</span>
    </a>
  );
}
