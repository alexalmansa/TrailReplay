import { isHeicFile } from '@/utils/files';

export interface RenderableImageAsset {
  displayFile?: File;
  url: string;
}

function getJpegFileName(name: string): string {
  return name.replace(/\.(heic|heif)$/i, '.jpg');
}

export async function createRenderableImageAsset(file: File): Promise<RenderableImageAsset> {
  if (!isHeicFile(file)) {
    return {
      url: URL.createObjectURL(file),
    };
  }

  try {
    const { heicTo } = await import('heic-to');
    const convertedBlob = await heicTo({
      blob: file,
      type: 'image/jpeg',
      quality: 0.92,
    });
    const displayFile = new File([convertedBlob], getJpegFileName(file.name), {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });

    return {
      displayFile,
      url: URL.createObjectURL(displayFile),
    };
  } catch (error) {
    console.warn('Failed to convert HEIC/HEIF image for preview:', error);
    return {
      url: URL.createObjectURL(file),
    };
  }
}
