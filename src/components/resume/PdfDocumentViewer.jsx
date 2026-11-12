import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, Minus, Plus } from "lucide-react";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const MIN_SCALE = 0.6;
const MAX_SCALE = 2;
const SCALE_STEP = 0.2;

export default function PdfDocumentViewer({ file, style }) {
  const canvasRef = useRef(null);
  const [documentProxy, setDocumentProxy] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let loadingTask;

    Promise.all([file.arrayBuffer(), import("pdfjs-dist")])
      .then(([buffer, pdfjs]) => {
        if (cancelled) return null;
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
        return loadingTask.promise;
      })
      .then((pdf) => {
        if (cancelled || !pdf) {
          void pdf?.destroy();
          return;
        }
        setDocumentProxy(pdf);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("This PDF could not be opened.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [file]);

  useEffect(() => {
    if (!documentProxy || !canvasRef.current) return undefined;
    let cancelled = false;
    let renderTask;

    documentProxy.getPage(pageNumber)
      .then((page) => {
        if (cancelled || !canvasRef.current) return;
        const viewport = page.getViewport({ scale });
        const outputScale = window.devicePixelRatio || 1;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
        });
        return renderTask.promise;
      })
      .catch(() => {
        if (!cancelled) setError("This PDF page could not be rendered.");
      });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [documentProxy, pageNumber, scale]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-slate-100 dark:border-gray-700 dark:bg-slate-900">
      {documentProxy && <div className={`flex shrink-0 items-center justify-center gap-3 border-b border-gray-200 px-3 py-2 dark:border-gray-700 ${style?.primaryText || ""}`}>
        <button type="button" disabled={pageNumber <= 1} onClick={() => setPageNumber((current) => current - 1)}
          className="rounded p-1 disabled:opacity-40" aria-label="Previous PDF page"><ChevronLeft size={18} /></button>
        <span className="min-w-20 text-center text-sm">{pageNumber} / {documentProxy.numPages}</span>
        <button type="button" disabled={pageNumber >= documentProxy.numPages} onClick={() => setPageNumber((current) => current + 1)}
          className="rounded p-1 disabled:opacity-40" aria-label="Next PDF page"><ChevronRight size={18} /></button>
        <span className="mx-1 h-5 border-l border-gray-300 dark:border-gray-600" />
        <button type="button" disabled={scale <= MIN_SCALE} onClick={() => setScale((current) => Math.max(MIN_SCALE, Number((current - SCALE_STEP).toFixed(1))))}
          className="rounded p-1 disabled:opacity-40" aria-label="Zoom out"><Minus size={16} /></button>
        <span className="min-w-12 text-center text-xs">{Math.round(scale * 100)}%</span>
        <button type="button" disabled={scale >= MAX_SCALE} onClick={() => setScale((current) => Math.min(MAX_SCALE, Number((current + SCALE_STEP).toFixed(1))))}
          className="rounded p-1 disabled:opacity-40" aria-label="Zoom in"><Plus size={16} /></button>
      </div>}
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-4">
        {loading && <div className="flex items-center gap-2 py-10 text-sm text-slate-600 dark:text-slate-300"><LoaderCircle size={18} className="animate-spin" />Opening PDF…</div>}
        {error && <p role="alert" className="py-10 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <canvas ref={canvasRef} className={loading || error ? "hidden" : "max-w-none shadow-lg"} />
      </div>
    </div>
  );
}
