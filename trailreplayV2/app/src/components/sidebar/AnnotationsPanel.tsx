import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Plus, Trash2, Play } from 'lucide-react';

const ACTIVITY_ICONS = [
  { icon: '🏃', label: 'Running', category: 'running' },
  { icon: '🚴', label: 'Cycling', category: 'cycling' },
  { icon: '🥾', label: 'Hiking', category: 'hiking' },
  { icon: '🚶', label: 'Walking', category: 'walking' },
  { icon: '⛷️', label: 'Skiing', category: 'skiing' },
  { icon: '🏊', label: 'Swimming', category: 'swimming' },
  { icon: '🧗', label: 'Climbing', category: 'climbing' },
  { icon: '🏇', label: 'Horse', category: 'horse' },
  { icon: '🛶', label: 'Kayak', category: 'kayak' },
  { icon: '🛹', label: 'Skate', category: 'skate' },
  { icon: '🎿', label: 'Ski', category: 'ski' },
  { icon: '🏂', label: 'Snowboard', category: 'snowboard' },
];

export function AnnotationsPanel() {
  const iconChanges = useAppStore((state) => state.iconChanges);
  const addIconChange = useAppStore((state) => state.addIconChange);
  const removeIconChange = useAppStore((state) => state.removeIconChange);
  const playback = useAppStore((state) => state.playback);
  const seekToProgress = useAppStore((state) => state.seekToProgress);
  
  const [selectedIcon, setSelectedIcon] = useState('🏃');
  const [showIconPicker, setShowIconPicker] = useState(false);
  
  const handleAddIconChange = () => {
    addIconChange({
      id: `icon-${Date.now()}`,
      progress: playback.progress,
      icon: selectedIcon,
      label: ACTIVITY_ICONS.find((a) => a.icon === selectedIcon)?.label,
    });
    setShowIconPicker(false);
  };
  
  // Sort icon changes by progress
  const sortedIconChanges = [...iconChanges].sort((a, b) => a.progress - b.progress);

  return (
    <div className="space-y-4">
      {/* Add Icon Change */}
      <div className="bg-[var(--trail-orange-15)] border-2 border-[var(--trail-orange)] rounded-lg p-4">
        <h3 className="text-sm font-bold text-[var(--evergreen)] mb-2">
          Add Icon Change at Current Position
        </h3>
        <p className="text-xs text-[var(--evergreen-60)] mb-3">
          Position: {(playback.progress * 100).toFixed(1)}%
        </p>
        
        <button
          onClick={() => setShowIconPicker(true)}
          className="w-full tr-btn tr-btn-primary flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Icon Change
        </button>
      </div>
      
      {/* Icon Changes List */}
      <div>
        <h3 className="text-sm font-bold text-[var(--evergreen)] mb-3 uppercase tracking-wide">
          Icon Changes ({iconChanges.length})
        </h3>
        
        {sortedIconChanges.length === 0 ? (
          <div className="text-center py-8 text-[var(--evergreen-60)]">
            <p className="text-sm">No icon changes yet</p>
            <p className="text-xs mt-1">Add icons at different positions</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedIconChanges.map((change) => (
              <div
                key={change.id}
                className="tr-journey-segment p-3 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--trail-orange-15)] flex items-center justify-center text-xl">
                  {change.icon}
                </div>
                
                <div className="flex-1">
                  <p className="font-medium text-sm text-[var(--evergreen)]">
                    {change.label || 'Activity'}
                  </p>
                  <p className="text-xs text-[var(--evergreen-60)]">
                    {(change.progress * 100).toFixed(1)}% of journey
                  </p>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => seekToProgress(change.progress)}
                    className="p-1.5 hover:bg-[var(--evergreen)]/10 rounded"
                    title="Go to position"
                  >
                    <Play className="w-4 h-4 text-[var(--evergreen-60)]" />
                  </button>
                  
                  <button
                    onClick={() => removeIconChange(change.id)}
                    className="p-1.5 hover:bg-red-100 text-red-500 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Icon Picker Modal */}
      {showIconPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--canvas)] border-2 border-[var(--evergreen)] rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-[var(--evergreen)] mb-4">
              Select Activity Icon
            </h3>
            
            <div className="grid grid-cols-4 gap-3 mb-6">
              {ACTIVITY_ICONS.map(({ icon, label }) => (
                <button
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={`
                    flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors
                    ${selectedIcon === icon 
                      ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]' 
                      : 'border-[var(--evergreen)]/20 hover:border-[var(--trail-orange)]/50'
                    }
                  `}
                >
                  <span className="text-2xl">{icon}</span>
                  <span className="text-[10px] text-[var(--evergreen)]">{label}</span>
                </button>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowIconPicker(false)}
                className="flex-1 tr-btn tr-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddIconChange}
                className="flex-1 tr-btn tr-btn-primary"
              >
                Add at {(playback.progress * 100).toFixed(1)}%
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
