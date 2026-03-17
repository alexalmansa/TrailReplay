import { Heart } from 'lucide-react';
import { useI18n } from '@/i18n/useI18n';

export function SupportButton() {
  const { t } = useI18n();
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
      title={t('app.supportTitle')}
      className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-[var(--trail-orange)] hover:bg-[var(--trail-orange)]/90 text-[var(--canvas)] rounded-lg transition-colors font-medium text-xs sm:text-sm"
    >
      <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
      <span className="hidden sm:inline">{t('app.support')}</span>
    </a>
  );
}
