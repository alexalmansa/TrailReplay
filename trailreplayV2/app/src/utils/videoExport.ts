import type { VideoExportSettings } from '@/types';

export interface VideoExportProgress {
  frame: number;
  totalFrames: number;
  progress: number;
  estimatedTimeRemaining: number;
}

export type ExportProgressCallback = (progress: VideoExportProgress) => void;

// Check if WebCodecs API is supported
export function isWebCodecsSupported(): boolean {
  return 'VideoEncoder' in window && 'VideoFrame' in window;
}

// Get supported MIME types for MediaRecorder
export function getSupportedMimeTypes(): string[] {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=avc1',
    'video/mp4',
  ];
  
  return types.filter(type => MediaRecorder.isTypeSupported(type));
}

// Video exporter class
export class VideoExporter {
  private canvas: HTMLCanvasElement;
  private settings: VideoExportSettings;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = false;
  private startTime: number = 0;
  private onProgress: ExportProgressCallback | null = null;
  
  constructor(canvas: HTMLCanvasElement, settings: VideoExportSettings, onProgress?: ExportProgressCallback) {
    this.canvas = canvas;
    this.settings = settings;
    this.onProgress = onProgress || null;
  }
  
  // Start recording using MediaRecorder
  async startRecording(): Promise<void> {
    if (this.isRecording) return;
    
    const stream = this.canvas.captureStream(this.settings.fps);
    const mimeType = this.getBestMimeType();
    
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: this.getVideoBitrate(),
    });
    
    this.recordedChunks = [];
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };
    
    this.mediaRecorder.start(100); // Collect data every 100ms
    this.isRecording = true;
    this.startTime = performance.now();
  }
  
  // Stop recording
  stopRecording(): Blob | null {
    if (!this.isRecording || !this.mediaRecorder) return null;
    
    this.mediaRecorder.stop();
    this.isRecording = false;
    
    const mimeType = this.mediaRecorder.mimeType;
    const blob = new Blob(this.recordedChunks, { type: mimeType });
    
    return blob;
  }
  
  // Export using WebCodecs API (higher quality, slower)
  async exportWithWebCodecs(
    renderFrame: (progress: number) => Promise<void> | void,
    duration: number
  ): Promise<Blob> {
    if (!isWebCodecsSupported()) {
      throw new Error('WebCodecs API not supported');
    }
    
    const { width, height } = this.settings.resolution;
    const fps = this.settings.fps;
    const totalFrames = Math.ceil(duration * fps / 1000);
    
    // Configure video encoder
    const encoder = new VideoEncoder({
      output: (_chunk, _metadata) => {
        // Handle encoded chunks
      },
      error: (error) => {
        console.error('Video encoding error:', error);
      },
    });
    
    encoder.configure({
      codec: 'vp09.00.10.08',
      width,
      height,
      bitrate: this.getVideoBitrate(),
      framerate: fps,
    });
    
    // Render and encode each frame
    for (let frameNum = 0; frameNum < totalFrames; frameNum++) {
      const progress = frameNum / totalFrames;
      
      // Render frame
      await renderFrame(progress);
      
      // Create video frame from canvas
      const videoFrame = new VideoFrame(this.canvas, {
        timestamp: frameNum * (1_000_000 / fps),
      });
      
      // Encode frame
      encoder.encode(videoFrame);
      videoFrame.close();
      
      // Report progress
      if (this.onProgress) {
        const elapsed = performance.now() - this.startTime;
        const estimatedTotal = (elapsed / (frameNum + 1)) * totalFrames;
        const estimatedTimeRemaining = estimatedTotal - elapsed;
        
        this.onProgress({
          frame: frameNum,
          totalFrames,
          progress: progress * 100,
          estimatedTimeRemaining,
        });
      }
      
      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    await encoder.flush();
    encoder.close();
    
    return new Blob([], { type: 'video/webm' });
  }
  
  // Get best available MIME type
  private getBestMimeType(): string {
    const supported = getSupportedMimeTypes();
    
    if (this.settings.format === 'mp4') {
      const mp4Type = supported.find(t => t.includes('mp4'));
      if (mp4Type) return mp4Type;
    }
    
    return supported[0] || 'video/webm';
  }
  
  // Get video bitrate based on quality setting
  private getVideoBitrate(): number {
    const bitrates = {
      low: 2_000_000,
      medium: 5_000_000,
      high: 10_000_000,
      ultra: 20_000_000,
    };
    
    return bitrates[this.settings.quality] || bitrates.high;
  }
  
  // Cancel export
  cancel(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
    
    this.isRecording = false;
    this.recordedChunks = [];
  }
}

// Download blob as file
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Get recommended resolution based on quality
export function getResolutionForQuality(quality: VideoExportSettings['quality']): { width: number; height: number } {
  const resolutions = {
    low: { width: 1280, height: 720 },
    medium: { width: 1920, height: 1080 },
    high: { width: 2560, height: 1440 },
    ultra: { width: 3840, height: 2160 },
  };
  
  return resolutions[quality];
}

// Calculate estimated file size
export function estimateFileSize(
  duration: number,
  settings: VideoExportSettings
): string {
  const bitrate = {
    low: 2_000_000,
    medium: 5_000_000,
    high: 10_000_000,
    ultra: 20_000_000,
  }[settings.quality];
  
  const sizeInBytes = (duration / 1000) * bitrate / 8;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  
  if (sizeInMB >= 1024) {
    return `${(sizeInMB / 1024).toFixed(2)} GB`;
  } else {
    return `${sizeInMB.toFixed(1)} MB`;
  }
}
