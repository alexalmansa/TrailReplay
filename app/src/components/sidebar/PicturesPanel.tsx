import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '@/store/useAppStore';
import { usePhotos } from '@/hooks/usePhotos';
import { isImageFile } from '@/utils/files';
import { useI18n } from '@/i18n/useI18n';
import { Switch } from '@/components/ui/switch';
import { RouteAnnotationsEditor } from './RouteAnnotationsEditor';
import { Play, Trash2, Image as ImageIcon, Video, MapPin, Clock, Settings2, MapPinned } from 'lucide-react';

const DEFAULT_DISPLAY_DURATION = 5000; // 5 seconds

export function PicturesPanel() {
  const { t } = useI18n();
  const pictures = useAppStore((state) => state.pictures);
  const videos = useAppStore((state) => state.videos);
  const textAnnotations = useAppStore((state) => state.textAnnotations);
  const showPictures = useAppStore((state) => state.settings.showPictures);
  const setSettings = useAppStore((state) => state.setSettings);
  const removePicture = useAppStore((state) => state.removePicture);
  const removeVideo = useAppStore((state) => state.removeVideo);
  const updatePictureDuration = useAppStore((state) => state.updatePictureDuration);
  const seekToProgress = useAppStore((state) => state.seekToProgress);
  const setSelectedPictureId = useAppStore((state) => state.setSelectedPictureId);
  const { addPhotos, isProcessing } = usePhotos();
  
  const [activeTab, setActiveTab] = useState<'pictures' | 'videos' | 'annotations'>('pictures');
  const [editingPicture, setEditingPicture] = useState<string | null>(null);
  const [durationValue, setDurationValue] = useState(5);
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (activeTab === 'pictures') {
      const imageFiles = acceptedFiles.filter((f) => isImageFile(f));
      if (imageFiles.length > 0) {
        await addPhotos(imageFiles as unknown as FileList);
      }
    }
  }, [activeTab, addPhotos]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: activeTab === 'pictures'
      ? { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] }
      : activeTab === 'videos'
        ? { 'video/*': ['.mp4', '.webm', '.mov'] }
        : undefined,
    multiple: true,
    noClick: activeTab === 'annotations',
    noDrag: activeTab === 'annotations',
  });

  const handleSaveDuration = (pictureId: string) => {
    updatePictureDuration(pictureId, durationValue * 1000);
    setEditingPicture(null);
  };

  const mediaTabs = [
    {
      id: 'pictures' as const,
      count: pictures.length,
      icon: ImageIcon,
      label: t('media.picturesTabLabel'),
    },
    {
      id: 'videos' as const,
      count: videos.length,
      icon: Video,
      label: t('media.videosTabLabel'),
    },
    {
      id: 'annotations' as const,
      count: textAnnotations.length,
      icon: MapPinned,
      label: t('media.annotationsTabLabel'),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--evergreen)]/15 bg-[var(--evergreen)]/3 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--evergreen)]">{t('settings.showPictures')}</p>
            <p className="text-xs text-[var(--evergreen-60)] mt-1">{t('media.showPicturesHint')}</p>
          </div>
          <Switch
            checked={showPictures}
            onCheckedChange={(checked) => setSettings({ showPictures: checked })}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[var(--evergreen)]/15 bg-[var(--evergreen)]/4 p-1.5">
        {mediaTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex min-h-[70px] flex-col items-center justify-center rounded-xl px-2 py-2 text-center transition-colors
                ${isActive
                  ? 'bg-[var(--trail-orange)] text-[var(--canvas)] shadow-[0_10px_18px_rgba(193,101,47,0.22)]'
                  : 'bg-transparent text-[var(--evergreen)] hover:bg-[var(--evergreen)]/10'
                }
              `}
            >
              <span
                className={`
                  absolute right-1.5 top-1.5 min-w-[1.2rem] rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none
                  ${isActive
                    ? 'bg-[rgba(255,255,255,0.2)] text-[var(--canvas)]'
                    : 'bg-[var(--evergreen)]/12 text-[var(--evergreen-60)]'}
                `}
              >
                {tab.count}
              </span>
              <Icon className="h-4 w-4" />
              <span className="mt-1 text-[11px] font-semibold leading-[1.15]">{tab.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Upload Area */}
      {activeTab !== 'annotations' && (
        <div
          {...getRootProps()}
          className={`
            tr-dropzone p-4
            ${isDragActive ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]' : ''}
          `}
        >
          <input {...getInputProps()} />
          {activeTab === 'pictures' ? (
            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-[var(--evergreen-60)]" />
          ) : (
            <Video className="w-8 h-8 mx-auto mb-2 text-[var(--evergreen-60)]" />
          )}
          <p className="text-sm font-medium text-[var(--evergreen)]">
            {isDragActive
              ? t('media.dropFiles')
              : activeTab === 'pictures'
                ? t('media.dragDropPictures')
                : t('media.dragDropVideos')}
          </p>
          <p className="text-xs text-[var(--evergreen-60)] mt-1">
            {t('media.dropBrowse')}
          </p>
        </div>
      )}
      
      {/* Processing */}
      {isProcessing && (
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="w-5 h-5 border-2 border-[var(--trail-orange)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--evergreen)]">{t('common.processing')}</span>
        </div>
      )}
      
      {/* Pictures List */}
      {activeTab === 'pictures' && (
        <div>
          {pictures.length === 0 ? (
            <div className="text-center py-8 text-[var(--evergreen-60)]">
              <p className="text-sm">{t('media.noPictures')}</p>
              <p className="text-xs mt-1">{t('media.noPicturesHint')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pictures.map((picture) => (
                <div
                  key={picture.id}
                  className="tr-journey-segment p-3"
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <button
                      type="button"
                      onClick={() => setSelectedPictureId(picture.id)}
                      className="w-20 h-20 rounded-xl overflow-hidden border border-[var(--evergreen)]/20 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--trail-orange)]"
                      title={t('media.previewPicture')}
                    >
                      <img
                        src={picture.url}
                        alt={t('media.trailAlt')}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <p className="text-sm font-medium text-[var(--evergreen)] truncate">
                          {picture.file.name}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {picture.placementSource === 'gps' && picture.lat !== undefined && picture.lon !== undefined && (
                          <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />
                            {t('media.gps')}
                          </span>
                        )}
                        {picture.placementSource === 'timestamp' && (
                          <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {t('media.timestamp')}
                          </span>
                        )}
                        {picture.placementSource === 'manual' && (
                          <span className="text-[10px] bg-[var(--trail-orange)] text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            {t('media.manual')}
                          </span>
                        )}
                        <span className="text-[11px] bg-[var(--evergreen)]/8 text-[var(--evergreen-60)] px-1.5 py-0.5 rounded">
                          {t('media.percentOfJourney', { percent: (picture.progress * 100).toFixed(0) })}
                        </span>
                      </div>
                      
                      {/* Duration Display */}
                      <div className="flex items-center gap-2 text-xs text-[var(--evergreen)]">
                        <Clock className="w-3 h-3 text-[var(--evergreen-60)]" />
                        <span>
                          {t('media.displayDuration', {
                            seconds: ((picture.displayDuration || DEFAULT_DISPLAY_DURATION) / 1000).toFixed(0),
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setEditingPicture(picture.id);
                        setDurationValue((picture.displayDuration || DEFAULT_DISPLAY_DURATION) / 1000);
                      }}
                      className="flex items-center justify-center rounded-lg border border-[var(--evergreen)]/15 bg-[var(--evergreen)]/5 px-3 py-2 hover:bg-[var(--evergreen)]/10"
                      title={t('media.editDuration')}
                    >
                      <Settings2 className="w-4 h-4 text-[var(--evergreen-60)]" />
                    </button>
                    <button
                      onClick={() => seekToProgress(picture.progress)}
                      className="flex items-center justify-center rounded-lg border border-[var(--evergreen)]/15 bg-[var(--evergreen)]/5 px-3 py-2 hover:bg-[var(--evergreen)]/10"
                    >
                      <Play className="w-4 h-4 text-[var(--evergreen-60)]" />
                    </button>
                    <button
                      onClick={() => removePicture(picture.id)}
                      className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                  
                  {/* Duration Editor */}
                  {editingPicture === picture.id && (
                    <div className="mt-3 pt-3 border-t border-[var(--evergreen)]/10">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-full text-xs text-[var(--evergreen-60)]">{t('media.displayFor')}</span>
                        <input
                          type="number"
                          value={durationValue}
                          onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 px-2 py-1.5 text-xs border border-[var(--evergreen)]/30 rounded"
                          min="1"
                          max="60"
                        />
                        <span className="text-xs text-[var(--evergreen-60)]">{t('media.seconds')}</span>
                        <button
                          onClick={() => handleSaveDuration(picture.id)}
                          className="ml-auto px-3 py-1.5 text-xs bg-[var(--trail-orange)] text-white rounded hover:bg-[var(--trail-orange)]/80"
                        >
                          {t('common.save')}
                        </button>
                        <button
                          onClick={() => setEditingPicture(null)}
                          className="px-3 py-1.5 text-xs bg-[var(--evergreen)]/10 text-[var(--evergreen)] rounded hover:bg-[var(--evergreen)]/20"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Videos List */}
      {activeTab === 'videos' && (
        <div>
          {videos.length === 0 ? (
            <div className="text-center py-8 text-[var(--evergreen-60)]">
              <p className="text-sm">{t('media.noVideos')}</p>
              <p className="text-xs mt-1">{t('media.noVideosHint')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="tr-journey-segment p-3 flex items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-lg bg-[var(--evergreen)]/10 flex items-center justify-center">
                    <Video className="w-6 h-6 text-[var(--evergreen)]" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[var(--evergreen)] truncate">
                      {video.file.name}
                    </p>
                    <p className="text-xs text-[var(--evergreen-60)]">
                      {t('media.percentOfJourney', { percent: (video.progress * 100).toFixed(0) })}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => seekToProgress(video.progress)}
                      className="p-1.5 hover:bg-[var(--evergreen)]/10 rounded"
                    >
                      <Play className="w-4 h-4 text-[var(--evergreen-60)]" />
                    </button>
                    <button
                      onClick={() => removeVideo(video.id)}
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
      )}

      {activeTab === 'annotations' && <RouteAnnotationsEditor />}
    </div>
  );
}
