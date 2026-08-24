export type ReplayArchiveErrorCode = 'corrupt' | 'unsupported-version' | 'missing-asset' | 'too-large';

export class ReplayArchiveError extends Error {
  code: ReplayArchiveErrorCode;

  constructor(code: ReplayArchiveErrorCode, message: string) {
    super(message);
    this.name = 'ReplayArchiveError';
    this.code = code;
  }
}
