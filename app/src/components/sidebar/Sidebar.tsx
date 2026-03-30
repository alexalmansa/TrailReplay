import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { SidebarPanelContent } from './SidebarPanelContent';
import { useI18n } from '@/i18n/useI18n';
import {
  MapPin,
  Route,
  Image,
  Palette,
  Video,
  Settings
} from 'lucide-react';

export function Sidebar() {
  const activeTab = useAppStore((state) => state.activePanel);
  const setActiveTab = useAppStore((state) => state.setActivePanel);
  const isExporting = useAppStore((state) => state.isExporting);
  const { t } = useI18n();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const tracks = useAppStore((state) => state.tracks);
  const journeySegments = useAppStore((state) => state.journeySegments);
  const pictures = useAppStore((state) => state.pictures);

  const tabs = [
    { id: 'tracks' as const, label: t('sidebar.tabs.tracks'), icon: MapPin, count: tracks.length },
    { id: 'journey' as const, label: t('sidebar.tabs.journey'), icon: Route, count: journeySegments.length },
    { id: 'annotations' as const, label: t('sidebar.tabs.annotations'), icon: Palette, count: 0 },
    { id: 'pictures' as const, label: t('sidebar.tabs.pictures'), icon: Image, count: pictures.length },
    { id: 'export' as const, label: t('sidebar.tabs.export'), icon: Video, count: 0 },
    { id: 'settings' as const, label: t('sidebar.tabs.settings'), icon: Settings, count: 0 },
  ];

  useEffect(() => {
    const activeButton = tabRefs.current[activeTab];
    if (!activeButton) return;

    requestAnimationFrame(() => {
      activeButton.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    });
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col bg-[var(--canvas)]">
      {/* Tabs */}
      <div className="flex border-b-2 border-[var(--evergreen)] overflow-x-auto flex-shrink-0 scroll-smooth">
        {tabs.map((tab) => {
          const isLockedByExport = isExporting && tab.id !== 'export';

          return (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[tab.id] = element;
            }}
            onClick={() => {
              if (isLockedByExport) return;
              setActiveTab(tab.id);
            }}
            disabled={isLockedByExport}
            className={`
              flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap transition-colors
              ${activeTab === tab.id
                ? 'bg-[var(--evergreen)] text-[var(--canvas)]'
                : 'text-[var(--evergreen)] hover:bg-[var(--evergreen)]/10'
              }
              ${isLockedByExport ? 'cursor-not-allowed opacity-45 hover:bg-transparent' : ''}
            `}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={`
                ml-1 px-1.5 py-0.5 rounded-full text-[10px]
                ${activeTab === tab.id
                  ? 'bg-[var(--trail-orange)]'
                  : 'bg-[var(--evergreen)]/20'
                }
              `}>
                {tab.count}
              </span>
            )}
          </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0">
        <div className="flex-1">
          <SidebarPanelContent />
        </div>
        <div className="pt-6 pb-2 border-t-2 border-[var(--evergreen)]/20">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2">
              <img src="/media/images/simplelogo.png" alt="TrailReplay" className="w-10 h-10 object-contain" />
            </div>
            <h4 className="font-bold text-[var(--evergreen)]">{t('sidebar.footerTitle')}</h4>
            <p className="text-xs text-[var(--evergreen-60)]">{t('sidebar.footerSubtitle')}</p>
            <a
              href="https://github.com/alexalmansa/TrailReplay"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--trail-orange)] hover:underline mt-2 inline-block"
            >
              {t('sidebar.footerGithub')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
