import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useGPX } from '@/hooks/useGPX';
import { usePhotos } from '@/hooks/usePhotos';
import { useAppStore } from '@/store/useAppStore';
import { isImageFile } from '@/utils/files';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileType,
  Image,
  X,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import { formatDistance, formatDuration } from '@/utils/units';

interface FileUploadProps {
  className?: string;
}

export function FileUpload({ className = '' }: FileUploadProps) {
  const [activeTab, setActiveTab] = useState('gpx');
  const { parseFiles, isParsing, parseError } = useGPX();
  const { addPhotos, isProcessing: isProcessingPhotos } = usePhotos();
  const tracks = useAppStore((state) => state.tracks);
  const pictures = useAppStore((state) => state.pictures);
  const removeTrack = useAppStore((state) => state.removeTrack);
  const settings = useAppStore((state) => state.settings);

  // GPX dropzone
  const onGPXDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const gpxFiles = acceptedFiles.filter(
        (file) => file.name.endsWith('.gpx') || file.type === 'application/gpx+xml'
      );
      if (gpxFiles.length > 0) {
        await parseFiles(gpxFiles as unknown as FileList);
      }
    },
    [parseFiles]
  );

  const gpxDropzone = useDropzone({
    onDrop: onGPXDrop,
    accept: {
      'application/gpx+xml': ['.gpx'],
    },
    multiple: true,
  });

  // Photos dropzone
  const onPhotosDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const imageFiles = acceptedFiles.filter((file) => isImageFile(file));
      if (imageFiles.length > 0) {
        await addPhotos(imageFiles as unknown as FileList);
      }
    },
    [addPhotos]
  );

  const photosDropzone = useDropzone({
    onDrop: onPhotosDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    },
    multiple: true,
  });

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gpx" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            GPX Files
          </TabsTrigger>
          <TabsTrigger value="photos" className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            Photos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gpx" className="mt-4">
          {/* GPX Upload Area */}
          <div
            {...gpxDropzone.getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              gpxDropzone.isDragActive
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...gpxDropzone.getInputProps()} />
            <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              {gpxDropzone.isDragActive
                ? 'Drop GPX files here...'
                : 'Drag & drop GPX files here'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              or click to browse (.gpx files)
            </p>
          </div>

          {/* Parsing status */}
          {isParsing && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              Parsing GPX files...
            </div>
          )}

          {/* Error message */}
          {parseError && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              {parseError}
            </div>
          )}

          {/* Track list */}
          {tracks.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Loaded Tracks ({tracks.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileType className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {track.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDistance(track.totalDistance, settings.unitSystem)} •{' '}
                          {formatDuration(track.totalTime)} •{' '}
                          {track.points.length} points
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeTrack(track.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          {/* Photos Upload Area */}
          <div
            {...photosDropzone.getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              photosDropzone.isDragActive
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...photosDropzone.getInputProps()} />
            <Image className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              {photosDropzone.isDragActive
                ? 'Drop photos here...'
                : 'Drag & drop photos here'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              or click to browse (JPG, PNG, GIF, WebP)
            </p>
            <p className="text-xs text-gray-400 mt-1">
              GPS location will be extracted automatically
            </p>
          </div>

          {/* Processing status */}
          {isProcessingPhotos && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              Processing photos...
            </div>
          )}

          {/* Photo list */}
          {pictures.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Loaded Photos ({pictures.length})
              </h4>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {pictures.map((picture: { id: string; url: string; lat?: number; lon?: number }) => (
                  <div
                    key={picture.id}
                    className="relative aspect-square rounded-lg overflow-hidden group"
                  >
                    <img
                      src={picture.url}
                      alt="Trail photo"
                      className="w-full h-full object-cover"
                    />
                    {picture.lat && picture.lon && (
                      <div className="absolute top-1 left-1 bg-green-500 text-white text-xs p-0.5 rounded">
                        <MapPin className="w-3 h-3" />
                      </div>
                    )}
                    <button
                      onClick={() => {
                        // Remove photo
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
