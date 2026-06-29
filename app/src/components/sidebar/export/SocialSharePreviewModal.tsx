import { Download, Loader2, X } from 'lucide-react';

interface Props {
  previewUrl: string;
  isRendering: boolean;
  onClose: () => void;
  onExport: () => void;
}

export function SocialSharePreviewModal({ previewUrl, isRendering, onClose, onExport }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--canvas)] rounded-xl shadow-2xl max-h-[94vh] w-full max-w-md flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 shrink-0">
          <h2 className="font-bold text-sm uppercase tracking-wide text-[var(--evergreen)]">
            Poster Preview
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 flex justify-center items-start">
          <img
            src={previewUrl}
            alt="Social share poster preview"
            className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg"
          />
        </div>

        <div className="px-4 py-3 border-t border-black/10 flex gap-2 shrink-0">
          <button onClick={onClose} className="tr-btn tr-btn-secondary flex-1">
            Back
          </button>
          <button
            onClick={onExport}
            disabled={isRendering}
            className="tr-btn tr-btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isRendering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}
