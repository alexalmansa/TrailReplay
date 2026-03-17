const MAX_IMAGE_DIMENSION = 2560;
const MAX_IMAGE_FILE_SIZE_BYTES = 6 * 1024 * 1024;
const OPTIMIZED_IMAGE_QUALITY = 0.86;

async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

/**
 * Downscales very large uploads so previews and exports do not carry the full
 * weight of original camera files when it is unnecessary.
 */
export async function optimizeImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size <= MAX_IMAGE_FILE_SIZE_BYTES) return file;
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;

  const imageBitmap = await loadImageBitmap(file);
  const largestDimension = Math.max(imageBitmap.width, imageBitmap.height);
  if (largestDimension <= MAX_IMAGE_DIMENSION) {
    imageBitmap.close();
    return file;
  }

  const scale = MAX_IMAGE_DIMENSION / largestDimension;
  const width = Math.round(imageBitmap.width * scale);
  const height = Math.round(imageBitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    imageBitmap.close();
    return file;
  }

  context.drawImage(imageBitmap, 0, 0, width, height);
  imageBitmap.close();

  const optimizedBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', OPTIMIZED_IMAGE_QUALITY);
  });

  if (!optimizedBlob || optimizedBlob.size >= file.size) {
    return file;
  }

  return new File([optimizedBlob], file.name.replace(/\.\w+$/, '.jpg'), {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  });
}
