import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '@/store/useAppStore';
import { usePhotos } from '@/hooks/usePhotos';
import { isImageFile } from '@/utils/files';
import { Play, Trash2, Image as ImageIcon, Video, MapPin, Clock, Settings2 } from 'lucide-react';

const DEFAULT_DISPLAY_DURATION = 5000; // 5 seconds

export function PicturesPanel() {
  const pictures = useAppStore((state) => state.pictures);
  const videos = useAppStore((state) => state.videos);
  const removePicture = useAppStore((state) => state.removePicture);
  const removeVideo = useAppStore((state) => state.removeVideo);
  const updatePictureDuration = useAppStore((state) => state.updatePictureDuration);
  const seekToProgress = useAppStore((state) => state.seekToProgress);
  const setSelectedPictureId = useAppStore((state) => state.setSelectedPictureId);
  const { addPhotos, isProcessing } = usePhotos();
  
  const [activeTab, setActiveTab] = useState<'pictures' | 'videos'>('pictures');
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
      : { 'video/*': ['.mp4', '.webm', '.mov'] },
    multiple: true,
  });

  const handleSaveDuration = (pictureId: string) => {
    updatePictureDuration(pictureId, durationValue * 1000);
    setEditingPicture(null);
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('pictures')}
          className={`
            flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2
            ${activeTab === 'pictures'
              ? 'bg-[var(--trail-orange)] text-[var(--canvas)]'
              : 'bg-[var(--evergreen)]/10 text-[var(--evergreen)] hover:bg-[var(--evergreen)]/20'
            }
          `}
        >
          <ImageIcon className="w-4 h-4" />
          Pictures ({pictures.length})
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={`
            flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2
            ${activeTab === 'videos'
              ? 'bg-[var(--trail-orange)] text-[var(--canvas)]'
              : 'bg-[var(--evergreen)]/10 text-[var(--evergreen)] hover:bg-[var(--evergreen)]/20'
            }
          `}
        >
          <Video className="w-4 h-4" />
          Videos ({videos.length})
        </button>
      </div>
      
      {/* Upload Area */}
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
          {isDragActive ? 'Drop files here' : `Drag & drop ${activeTab}`}
        </p>
        <p className="text-xs text-[var(--evergreen-60)] mt-1">
          or click to browse
        </p>
      </div>
      
      {/* Processing */}
      {isProcessing && (
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="w-5 h-5 border-2 border-[var(--trail-orange)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--evergreen)]">Processing...</span>
        </div>
      )}
      
      {/* Pictures List */}
      {activeTab === 'pictures' && (
        <div>
          {pictures.length === 0 ? (
            <div className="text-center py-8 text-[var(--evergreen-60)]">
              <p className="text-sm">No pictures uploaded</p>
              <p className="text-xs mt-1">Add pictures to show on the map</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pictures.map((picture) => (
                <div
                  key={picture.id}
                  className="tr-journey-segment p-2"
                >
                  <div className="flex items-center gap-3">
                    {/* Thumbnail */}
                    <button
                      type="button"
                      onClick={() => setSelectedPictureId(picture.id)}
                      className="w-16 h-16 rounded-lg overflow-hidden border border-[var(--evergreen)]/20 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--trail-orange)]"
                      title="Preview picture"
                    >
                      <img
                        src={picture.url}
                        alt="Trail"
                        className="w-full h-full object-cover"
                      />
                    </button>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {picture.lat && picture.lon && (
                          <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />
                            GPS
                          </span>
                        )}
                        <span className="text-xs text-[var(--evergreen-60)]">
                          {(picture.progress * 100).toFixed(0)}% of journey
                        </span>
                      </div>
                      
                      {/* Duration Display */}
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="w-3 h-3 text-[var(--evergreen-60)]" />
                        <span className="text-[var(--evergreen)]">
                          {(picture.displayDuration || DEFAULT_DISPLAY_DURATION) / 1000}s display
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingPicture(picture.id);
                          setDurationValue((picture.displayDuration || DEFAULT_DISPLAY_DURATION) / 1000);
                        }}
                        className="p-1.5 hover:bg-[var(--evergreen)]/10 rounded"
                        title="Edit duration"
                      >
                        <Settings2 className="w-4 h-4 text-[var(--evergreen-60)]" />
                      </button>
                      <button
                        onClick={() => seekToProgress(picture.progress)}
                        className="p-1.5 hover:bg-[var(--evergreen)]/10 rounded"
                      >
                        <Play className="w-4 h-4 text-[var(--evergreen-60)]" />
                      </button>
                      <button
                        onClick={() => removePicture(picture.id)}
                        className="p-1.5 hover:bg-red-100 text-red-500 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Duration Editor */}
                  {editingPicture === picture.id && (
                    <div className="mt-2 pt-2 border-t border-[var(--evergreen)]/10">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--evergreen-60)]">Display for:</span>
                        <input
                          type="number"
                          value={durationValue}
                          onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 px-2 py-1 text-xs border border-[var(--evergreen)]/30 rounded"
                          min="1"
                          max="60"
                        />
                        <span className="text-xs text-[var(--evergreen-60)]">seconds</span>
                        <button
                          onClick={() => handleSaveDuration(picture.id)}
                          className="ml-auto px-3 py-1 text-xs bg-[var(--trail-orange)] text-white rounded hover:bg-[var(--trail-orange)]/80"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPicture(null)}
                          className="px-3 py-1 text-xs bg-[var(--evergreen)]/10 text-[var(--evergreen)] rounded hover:bg-[var(--evergreen)]/20"
                        >
                          Cancel
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
              <p className="text-sm">No videos uploaded</p>
              <p className="text-xs mt-1">Add videos to show on the map</p>
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
                      {(video.progress * 100).toFixed(0)}% of journey
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
    </div>
  );
}
