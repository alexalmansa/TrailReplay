import { ArrayBufferTarget, Muxer } from 'mp4-muxer';

export interface Mp4CanvasEncoderOptions {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
}

export interface Mp4CanvasEncoder {
  /**
   * Encode the current contents of the canvas at the given presentation time
   * (microseconds since recording start). Using real elapsed time — rather than
   * a frame index — keeps the output duration equal to the wall-clock recording
   * time even if frame capture can't keep up with the target fps.
   */
  encodeCanvas(canvas: HTMLCanvasElement, timestampMicros: number): void;
  /** Number of frames still queued in the encoder (for backpressure decisions). */
  pendingFrames(): number;
  /** Flush, mux and return the finished MP4 as a Blob. */
  finalize(): Promise<Blob>;
  /** Abort without producing a file (e.g. on cancel). */
  close(): void;
}

// Hardware H.264 encoding produces a clean, seekable MP4 with a real moov/duration,
// which avoids the "freezes after the first fragment" problem of MediaRecorder fMP4.
export function isWebCodecsMp4Supported(): boolean {
  return typeof window !== 'undefined'
    && typeof VideoEncoder !== 'undefined'
    && typeof VideoFrame !== 'undefined';
}

// H.264 codec strings from most to least capable. Higher resolutions need higher
// levels; we probe support and fall back so the export still works on machines
// whose encoder only offers baseline/main profiles.
function avcCandidates(width: number, height: number): string[] {
  const area = width * height;
  if (area > 1920 * 1080) {
    // 1440p / 4K: prefer High profile at level 5.1/5.2.
    return ['avc1.640034', 'avc1.640033', 'avc1.640028', 'avc1.4D4028', 'avc1.42E01E'];
  }
  return ['avc1.640028', 'avc1.4D4028', 'avc1.42E01E', 'avc1.640033'];
}

async function resolveSupportedConfig(
  options: Mp4CanvasEncoderOptions
): Promise<VideoEncoderConfig | null> {
  for (const codec of avcCandidates(options.width, options.height)) {
    const config: VideoEncoderConfig = {
      codec,
      width: options.width,
      height: options.height,
      bitrate: options.bitrate,
      framerate: options.fps,
      avc: { format: 'avc' },
      latencyMode: 'realtime',
    };
    try {
      const support = await VideoEncoder.isConfigSupported(config);
      if (support.supported) return config;
    } catch {
      // Try the next candidate codec.
    }
  }
  return null;
}

export async function createMp4CanvasEncoder(
  options: Mp4CanvasEncoderOptions
): Promise<Mp4CanvasEncoder | null> {
  if (!isWebCodecsMp4Supported()) return null;

  const config = await resolveSupportedConfig(options);
  if (!config) return null;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width: options.width,
      height: options.height,
      // No frameRate: timestamps are real elapsed time (variable spacing), so we
      // don't want the muxer snapping them to a fixed fps grid.
    },
    // Place the moov atom at the front so the file is seekable and players know
    // its duration up front. Keeps chunks in memory until finalize().
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      encoderError = error instanceof Error ? error : new Error(String(error));
    },
  });
  encoder.configure(config);

  const frameDurationMicros = Math.round(1_000_000 / options.fps);
  const keyFrameIntervalMicros = 2_000_000; // Force a keyframe at least every 2s.
  let lastTimestampMicros = -1;
  let lastKeyframeMicros = -keyFrameIntervalMicros;
  let finalized = false;

  return {
    encodeCanvas(canvas, timestampMicros) {
      if (finalized || encoderError || encoder.state !== 'configured') return;
      // If the encoder falls badly behind on a heavy resolution, drop this frame
      // rather than exhausting memory. The previous frame simply shows a little
      // longer; timestamps stay correct so playback never desyncs.
      if (encoder.encodeQueueSize > 30) return;

      // Timestamps must be strictly increasing; skip any non-advancing frame.
      const timestamp = Math.max(0, Math.round(timestampMicros));
      if (timestamp <= lastTimestampMicros) return;
      lastTimestampMicros = timestamp;

      const keyFrame = timestamp - lastKeyframeMicros >= keyFrameIntervalMicros;
      if (keyFrame) lastKeyframeMicros = timestamp;

      const frame = new VideoFrame(canvas, {
        timestamp,
        duration: frameDurationMicros,
      });
      try {
        encoder.encode(frame, { keyFrame });
      } finally {
        frame.close();
      }
    },
    pendingFrames() {
      return encoder.encodeQueueSize;
    },
    async finalize() {
      finalized = true;
      await encoder.flush();
      if (encoderError) throw encoderError;
      muxer.finalize();
      if (encoder.state !== 'closed') encoder.close();
      return new Blob([muxer.target.buffer], { type: 'video/mp4' });
    },
    close() {
      finalized = true;
      try {
        if (encoder.state !== 'closed') encoder.close();
      } catch {
        // Already closed.
      }
    },
  };
}
