import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, FileText, Minus, Plus, X } from 'lucide-react';
import { api } from '../api/client.js';
import type { VaultFile } from '../types/api.js';

const MAX_TEXT_PREVIEW_BYTES = 2 * 1024 * 1024;
const MAX_DOCX_PREVIEW_BYTES = 20 * 1024 * 1024;
const ZOOM_MIN = 60;
const ZOOM_MAX = 160;
const ZOOM_STEP = 10;

const TOOLBAR_BUTTON =
  'inline-flex size-[30px] shrink-0 items-center justify-center rounded-[7px] text-fog transition-colors hover:bg-obsidian hover:text-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-lime/70 disabled:cursor-not-allowed disabled:text-ash disabled:hover:bg-transparent disabled:hover:text-ash';

const DOCUMENT_PAGE_CLASS =
  'rounded-[3px] bg-paper text-[14px] leading-6 text-[#202124] [&_a]:text-[#2563eb] [&_h1]:mb-16 [&_h1]:text-[24px] [&_h1]:font-[590] [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-[20px] [&_h2]:font-[590] [&_img]:max-w-full [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#d0d6e0] [&_td]:p-2 [&_th]:border [&_th]:border-[#d0d6e0] [&_th]:p-2 [&_ul]:list-disc';

type FilePreviewContent =
  | { kind: 'document'; html: string }
  | { kind: 'image'; url: string }
  | { kind: 'pdf'; url: string }
  | { kind: 'text'; text: string };

interface VaultFileViewerProps {
  file: VaultFile;
  onClose: () => void;
}

function getFilePreviewKind(file: VaultFile): 'document' | 'image' | 'pdf' | 'text' | 'unsupported' {
  const contentType = file.content_type?.toLowerCase() || '';
  const extension = file.original_filename.toLowerCase().split('.').pop() || '';
  if (contentType === 'application/pdf' || extension === 'pdf') return 'pdf';
  if (contentType.startsWith('image/')) return 'image';
  if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension === 'docx') return 'document';
  if (contentType.startsWith('text/') || contentType === 'application/json' || ['txt', 'md', 'csv', 'json'].includes(extension)) return 'text';
  return 'unsupported';
}

function getPreviewLimitError(file: VaultFile, kind: ReturnType<typeof getFilePreviewKind>): string {
  const size = file.size_bytes || 0;
  if (kind === 'text' && size > MAX_TEXT_PREVIEW_BYTES) return 'Text previews are limited to 2 MB to keep the browser responsive.';
  if (kind === 'document' && size > MAX_DOCX_PREVIEW_BYTES) return 'Word document previews are limited to 20 MB to keep the browser responsive.';
  return '';
}

function formatTextPreview(text: string, file: VaultFile): string {
  const isJson = file.content_type === 'application/json' || file.original_filename.toLowerCase().endsWith('.json');
  if (!isJson) return text;
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

function formatFileSize(sizeBytes?: number): string {
  if (!sizeBytes) return '0 B';
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtensionMark(filename: string): string {
  const mark = (filename.split('.').pop() || '').slice(0, 1).toUpperCase();
  return mark || 'F';
}

export default function VaultFileViewer({ file, onClose }: VaultFileViewerProps) {
  const previewKind = getFilePreviewKind(file);
  const previewLimitError = getPreviewLimitError(file, previewKind);
  const [content, setContent] = useState<FilePreviewContent | null>(null);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(100);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const unavailableMessage = previewLimitError || (
    previewKind === 'unsupported'
      ? 'This file format cannot be previewed safely in the browser. You can still download the file.'
      : ''
  );

  useEffect(() => {
    if (previewKind === 'unsupported' || previewLimitError) return;
    let isCancelled = false;
    let objectUrl = '';

    const loadPreview = async () => {
      try {
        const blob = await api.fetchVaultFileContent(file.id);
        if (previewKind === 'document') {
          const [mammothModule, domPurifyModule] = await Promise.all([
            import('mammoth'),
            import('dompurify'),
          ]);
          const result = await mammothModule.default.convertToHtml(
            { arrayBuffer: await blob.arrayBuffer() },
            { convertImage: mammothModule.default.images.dataUri },
          );
          if (!isCancelled) {
            setContent({
              kind: 'document',
              html: domPurifyModule.default.sanitize(result.value),
            });
          }
          return;
        }
        if (previewKind === 'text') {
          const text = formatTextPreview(await blob.text(), file);
          if (!isCancelled) setContent({ kind: 'text', text });
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        if (!isCancelled) setContent({ kind: previewKind, url: objectUrl });
      } catch (previewError) {
        if (!isCancelled) setError(errorMessage(previewError));
      }
    };

    void loadPreview();
    return () => {
      isCancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, previewKind, previewLimitError]);

  const handleDownload = async () => {
    try {
      const result = await api.getFileDownload(file.id);
      window.location.assign(result.download_url);
    } catch (downloadError) {
      setError(errorMessage(downloadError));
    }
  };

  const adjustZoom = useCallback((amount: number) => {
    setZoom((current) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, current + amount)));
  }, []);

  const goPage = useCallback((delta: number) => {
    const canvas = canvasRef.current;
    const page = pageRef.current;
    if (!canvas || !page) return;
    canvas.scrollBy({ top: delta * page.offsetHeight, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    stageRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowDown') goPage(1);
      if (event.key === 'ArrowUp') goPage(-1);
      if (event.key === 'ArrowRight') goPage(1);
      if (event.key === 'ArrowLeft') goPage(-1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goPage]);

  const handleTabTrap = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = stageRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const pagesScale = { transform: `scale(${zoom / 100})`, transformOrigin: 'top center' as const };

  const renderStage = () => {
    if (error) {
      return (
        <div className="grid min-h-[20rem] place-items-center rounded-control border border-graphite bg-white/[0.015] p-6 text-center">
          <div>
            <FileText className="mx-auto mb-3 text-fog" size={28} aria-hidden="true" />
            <p className="m-0 text-[13px] text-mist">Preview unavailable</p>
            <p className="mt-2 text-[11px] leading-4 text-ash">{error}</p>
          </div>
        </div>
      );
    }
    if (unavailableMessage) {
      return (
        <div className="grid min-h-[20rem] place-items-center rounded-control border border-graphite bg-white/[0.015] p-6 text-center">
          <div>
            <FileText className="mx-auto mb-3 text-fog" size={28} aria-hidden="true" />
            <p className="m-0 text-[13px] text-mist">Preview unavailable</p>
            <p className="mt-2 text-[11px] leading-4 text-ash">{unavailableMessage}</p>
          </div>
        </div>
      );
    }
    if (!content) {
      return (
        <div className="loading-state min-h-[20rem]" aria-live="polite">
          <span className="spinner" />
          Preparing preview…
        </div>
      );
    }
    if (content.kind === 'image') {
      return (
        <img
          className="max-h-[78vh] max-w-[92vw] rounded-[3px] object-contain shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
          src={content.url}
          alt={`Preview of ${file.original_filename}`}
        />
      );
    }
    return (
      <div ref={pageRef} className="shrink-0">
        {content.kind === 'pdf' ? (
          <iframe
            className="h-[828px] w-[640px] max-w-[92vw] rounded-[3px] bg-paper shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
            src={content.url}
            title={`Preview of ${file.original_filename}`}
          />
        ) : content.kind === 'text' ? (
          <pre className={`h-[828px] w-[640px] max-w-[92vw] overflow-auto whitespace-pre-wrap break-words bg-paper p-16 font-mono text-[12px] leading-5 text-[#202124] shadow-[0_18px_40px_rgba(0,0,0,0.45)]`}>
            {content.text}
          </pre>
        ) : (
          <article
            className={`h-[828px] w-[640px] max-w-[92vw] overflow-auto bg-paper p-16 shadow-[0_18px_40px_rgba(0,0,0,0.45)] ${DOCUMENT_PAGE_CLASS}`}
            dangerouslySetInnerHTML={{ __html: content.html }}
          />
        )}
      </div>
    );
  };

  const hasPaginatedPage = Boolean(content && content.kind !== 'image');

  return (
    <div
      ref={stageRef}
      className="fixed inset-0 z-50 flex flex-col bg-void text-bone"
      role="dialog"
      aria-modal="true"
      aria-label={`File viewer: ${file.original_filename}`}
      tabIndex={-1}
      onKeyDown={handleTabTrap}
    >
      <header className="flex h-[54px] shrink-0 items-center gap-[14px] border-b border-graphite bg-carbon px-[14px]">
        <button className={TOOLBAR_BUTTON} type="button" aria-label="Back to vault" onClick={onClose}>
          <ArrowLeft size={16} />
        </button>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-[22px] shrink-0 place-items-center rounded-[5px] bg-obsidian text-[10px] font-bold text-bone ring-1 ring-graphite">
            {getExtensionMark(file.original_filename)}
          </span>
          <span className="truncate text-[13.5px] font-medium text-bone">{file.original_filename}</span>
          <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-ash">
            <span className="rounded-full border border-graphite bg-obsidian px-2 py-0.5 text-[10.5px] text-fog">View only</span>
            <span>{formatFileSize(file.size_bytes)}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-ash">
          <span className="hidden md:block">Atlas</span>
          <span className="hidden text-smoke md:block">/</span>
          <b className="hidden font-medium text-fog md:block">Secure vault</b>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-[32px] items-center gap-1.5 rounded-[7px] border border-acid-lime bg-acid-lime px-3 text-[12.5px] font-semibold text-acid-lime-text transition-colors hover:bg-acid-lime-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-lime/70"
            type="button"
            onClick={handleDownload}
          >
            <Download size={14} />
            Download
          </button>
          <button className={TOOLBAR_BUTTON} type="button" aria-label="Close viewer" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="flex h-[44px] shrink-0 items-center gap-4 border-b border-graphite bg-void px-[14px]">
        <div className="flex items-center gap-0.5">
          <button
            className={TOOLBAR_BUTTON}
            type="button"
            aria-label="Previous page"
            disabled={!hasPaginatedPage}
            onClick={() => goPage(-1)}
          >
            <ChevronLeft size={15} />
          </button>
          <span className="px-1 text-[12.5px] text-fog">
            Page <b className="font-medium text-bone">1</b> of 1
          </span>
          <button
            className={TOOLBAR_BUTTON}
            type="button"
            aria-label="Next page"
            disabled={!hasPaginatedPage}
            onClick={() => goPage(1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="flex-1" />
        <div className="flex h-[30px] items-center gap-0.5 rounded-[7px] border border-graphite bg-carbon px-1">
          <button className={TOOLBAR_BUTTON} type="button" aria-label="Zoom out" disabled={zoom <= ZOOM_MIN} onClick={() => adjustZoom(-ZOOM_STEP)}>
            <Minus size={13} />
          </button>
          <span className="w-[42px] text-center text-[12px] tabular-nums text-fog">{zoom}%</span>
          <button className={TOOLBAR_BUTTON} type="button" aria-label="Zoom in" disabled={zoom >= ZOOM_MAX} onClick={() => adjustZoom(ZOOM_STEP)}>
            <Plus size={13} />
          </button>
        </div>
      </div>

      <div ref={canvasRef} className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_50%_0%,var(--color-carbon)_0%,var(--color-void)_70%)]">
        <div className="flex flex-col items-center gap-7 px-4 py-10 md:py-[80px]" style={pagesScale}>
          {renderStage()}
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-[9px] border border-graphite bg-obsidian/90 px-3.5 py-1.5 text-[12px] text-fog backdrop-blur-[6px]">
        Page <b className="font-medium text-bone">1</b> of 1
      </div>
      <div className="fixed bottom-5 right-6 z-[60] flex items-center gap-0.5 rounded-[9px] border border-graphite bg-obsidian/90 p-1 backdrop-blur-[6px]">
        <button
          className="grid size-[26px] place-items-center rounded-[6px] text-fog transition-colors hover:bg-carbon hover:text-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-lime/70 disabled:cursor-not-allowed disabled:text-ash disabled:hover:bg-transparent disabled:hover:text-ash"
          type="button"
          aria-label="Zoom out"
          disabled={zoom <= ZOOM_MIN}
          onClick={() => adjustZoom(-ZOOM_STEP)}
        >
          <Minus size={13} />
        </button>
        <span className="w-[42px] text-center text-[12px] tabular-nums text-fog">{zoom}%</span>
        <button
          className="grid size-[26px] place-items-center rounded-[6px] text-fog transition-colors hover:bg-carbon hover:text-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-lime/70 disabled:cursor-not-allowed disabled:text-ash disabled:hover:bg-transparent disabled:hover:text-ash"
          type="button"
          aria-label="Zoom in"
          disabled={zoom >= ZOOM_MAX}
          onClick={() => adjustZoom(ZOOM_STEP)}
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}