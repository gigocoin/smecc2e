"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applicationDocumentUrl,
  documentPreviewKind,
  type ApplicationDocumentField,
  type DocumentPreviewKind,
} from "@/lib/application-documents";

async function renderPdfPages(buffer: ArrayBuffer): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const images: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.35 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport, canvas }).promise;
    images.push(canvas.toDataURL("image/jpeg", 0.92));
  }

  return images;
}

export function ApplicationDocumentPreview({
  applicationId,
  field,
  fileName,
}: {
  applicationId: string;
  field: ApplicationDocumentField;
  fileName: string;
}) {
  const initialPreviewKind = documentPreviewKind(fileName);
  const [previewKind, setPreviewKind] =
    useState<DocumentPreviewKind>(initialPreviewKind);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

  const loadPreview = useCallback(async () => {
    if (loaded || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(applicationDocumentUrl(applicationId, field), {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Could not load document.");
      }

      const kind = documentPreviewKind(
        fileName,
        res.headers.get("content-type")
      );
      setPreviewKind(kind);

      if (kind === "unsupported") {
        return;
      }

      if (kind === "image") {
        const blob = await res.blob();
        revokeObjectUrl();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setImageUrl(url);
      } else {
        const buffer = await res.arrayBuffer();
        const pages = await renderPdfPages(buffer);
        if (pages.length === 0) {
          throw new Error("Could not render document preview.");
        }
        setPdfPages(pages);
      }

      setLoaded(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load document preview."
      );
    } finally {
      setLoading(false);
    }
  }, [
    applicationId,
    field,
    fileName,
    loaded,
    loading,
    revokeObjectUrl,
  ]);

  const handleToggle = (event: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (event.currentTarget.open) {
      void loadPreview();
    } else {
      revokeObjectUrl();
      setImageUrl(null);
      setPdfPages([]);
      setLoaded(false);
      setError(null);
      setPreviewKind(initialPreviewKind);
    }
  };

  const blockSave = (event: React.MouseEvent | React.DragEvent) => {
    event.preventDefault();
  };

  return (
    <details
      onToggle={handleToggle}
      className="group rounded-lg border border-emerald-200 bg-emerald-50/60"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-emerald-950 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex min-w-0 items-center gap-2">
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className="break-all">{fileName}</span>
        </span>
        <svg
          className="h-4 w-4 shrink-0 text-emerald-800 transition group-open:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </summary>

      <div
        className="select-none border-t border-emerald-200 bg-white"
        onContextMenu={blockSave}
      >
        {previewKind === "unsupported" && !loading && (
          <p className="px-3 py-4 text-sm font-semibold text-slate-700">
            Inline preview is not available for Word documents. PDF and image
            files can be viewed here.
          </p>
        )}

        {previewKind !== "unsupported" && loading && (
          <p className="px-3 py-6 text-center text-sm font-medium text-slate-600">
            Loading preview…
          </p>
        )}

        {error && (
          <p className="px-3 py-4 text-sm font-semibold text-red-700" role="alert">
            {error}
          </p>
        )}

        {!loading && imageUrl && (
          <div className="max-h-96 overflow-auto bg-slate-100 p-2">
            <img
              src={imageUrl}
              alt={`Preview of ${fileName}`}
              draggable={false}
              onDragStart={blockSave}
              className="mx-auto block max-h-[22rem] w-auto max-w-full rounded border border-slate-200 bg-white object-contain"
            />
          </div>
        )}

        {!loading && pdfPages.length > 0 && (
          <div className="max-h-96 overflow-y-auto bg-slate-100">
            {pdfPages.map((pageUrl, index) => (
              <img
                key={index}
                src={pageUrl}
                alt={`${fileName} page ${index + 1}`}
                draggable={false}
                onDragStart={blockSave}
                className="block w-full border-b border-slate-200 bg-white"
              />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
