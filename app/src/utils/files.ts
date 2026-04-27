const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'heic',
  'heif',
]);

const HEIC_EXTENSIONS = new Set(['heic', 'heif']);

export function isImageFile(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) {
    return true;
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  return !!extension && IMAGE_EXTENSIONS.has(extension);
}

export function isHeicFile(file: File): boolean {
  if (file.type === 'image/heic' || file.type === 'image/heif') {
    return true;
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  return !!extension && HEIC_EXTENSIONS.has(extension);
}
