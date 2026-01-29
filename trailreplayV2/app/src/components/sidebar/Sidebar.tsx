import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { TracksPanel } from './TracksPanel';
import { JourneyPanel } from './JourneyPanel';
import { AnnotationsPanel } from './AnnotationsPanel';
import { PicturesPanel } from './PicturesPanel';
import { ExportPanel } from './ExportPanel';
import { SettingsPanel } from './SettingsPanel';
import { 
  MapPin, 
  Route, 
  Image, 
  Type, 
  Video, 
  Settings
} from 'lucide-react';

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<'tracks' | 'journey' | 'annotations' | 'pictures' | 'export' | 'settings'>('tracks');
  
  const tracks = useAppStore((state) => state.tracks);
  const journeySegments = useAppStore((state) => state.journeySegments);
  const pictures = useAppStore((state) => state.pictures);
  const iconChanges = useAppStore((state) => state.iconChanges);
  
  const tabs = [
    { id: 'tracks' as const, label: 'Tracks', icon: MapPin, count: tracks.length },
    { id: 'journey' as const, label: 'Journey', icon: Route, count: journeySegments.length },
    { id: 'annotations' as const, label: 'Icons', icon: Type, count: iconChanges.length },
    { id: 'pictures' as const, label: 'Media', icon: Image, count: pictures.length },
    { id: 'export' as const, label: 'Export', icon: Video, count: 0 },
    { id: 'settings' as const, label: 'Settings', icon: Settings, count: 0 },
  ];

  return (
    <div className="h-full flex flex-col bg-[var(--canvas)]">
      {/* Tabs */}
      <div className="flex border-b-2 border-[var(--evergreen)] overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap transition-colors
              ${activeTab === tab.id 
                ? 'bg-[var(--evergreen)] text-[var(--canvas)]' 
                : 'text-[var(--evergreen)] hover:bg-[var(--evergreen)]/10'
              }
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
        ))}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'tracks' && <TracksPanel />}
        {activeTab === 'journey' && <JourneyPanel />}
        {activeTab === 'annotations' && <AnnotationsPanel />}
        {activeTab === 'pictures' && <PicturesPanel />}
        {activeTab === 'export' && <ExportPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
}
