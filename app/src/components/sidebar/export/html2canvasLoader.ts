export type Html2Canvas = (
  element: HTMLElement,
  options: {
    backgroundColor: string | null;
    scale: number;
    logging: boolean;
    useCORS: boolean;
    allowTaint?: boolean;
  }
) => Promise<HTMLCanvasElement>;

declare global {
  interface Window {
    html2canvas?: Html2Canvas;
  }
}

export function resolveHtml2Canvas() {
  return window.html2canvas ?? null;
}

export async function loadHtml2Canvas() {
  if (resolveHtml2Canvas()) return true;

  return new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}
