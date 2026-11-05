"use client";

import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PDF_MARGIN_MM = 8;
const A4_CAPTURE_WIDTH_PX = Math.round((A4_WIDTH_MM / 25.4) * 96);

type StyleSnapshot = {
  el: HTMLElement;
  cssText: string;
};

/** Temporarily clear overflow / clipping so the full form is capturable. */
function unlockClipping(root: HTMLElement): () => void {
  const snapshots: StyleSnapshot[] = [];
  const visit = (el: HTMLElement) => {
    snapshots.push({ el, cssText: el.style.cssText });
    el.style.setProperty("overflow", "visible", "important");
    el.style.setProperty("overflow-x", "visible", "important");
    el.style.setProperty("overflow-y", "visible", "important");
    el.style.setProperty("max-height", "none", "important");
  };

  let ancestor: HTMLElement | null = root;
  while (ancestor) {
    visit(ancestor);
    ancestor = ancestor.parentElement;
  }
  root.querySelectorAll<HTMLElement>("*").forEach(visit);

  return () => {
    for (const snap of snapshots) {
      snap.el.style.cssText = snap.cssText;
    }
  };
}

function prepareCloneForPdf(clonedDoc: Document, clonedElement: HTMLElement) {
  clonedDoc.querySelectorAll("[data-pdf-exclude]").forEach((el) => {
    (el as HTMLElement).style.display = "none";
  });
  clonedDoc.querySelectorAll("button").forEach((el) => {
    el.style.display = "none";
  });

  clonedElement.style.boxSizing = "border-box";
  clonedElement.style.width = `${A4_CAPTURE_WIDTH_PX}px`;
  clonedElement.style.maxWidth = `${A4_CAPTURE_WIDTH_PX}px`;
  clonedElement.style.minWidth = "0";
  clonedElement.style.boxShadow = "none";
  clonedElement.style.borderRadius = "0";
  clonedElement.style.border = "none";
  clonedElement.style.margin = "0";
  clonedElement.style.background = "#ffffff";
  clonedElement.style.overflow = "visible";

  clonedElement.querySelectorAll<HTMLElement>("*").forEach((el) => {
    el.style.setProperty("overflow", "visible", "important");
    el.style.setProperty("overflow-x", "visible", "important");
    el.style.setProperty("overflow-y", "visible", "important");
    el.style.setProperty("max-height", "none", "important");
    if (el.tagName === "TABLE" || el.tagName === "SECTION") {
      el.style.minWidth = "0";
      el.style.width = "100%";
      el.style.maxWidth = "100%";
    }
    if (el.tagName === "TD" || el.tagName === "TH" || el.tagName === "P" || el.tagName === "SPAN" || el.tagName === "LABEL") {
      el.style.whiteSpace = "normal";
      el.style.wordBreak = "break-word";
      el.style.overflowWrap = "anywhere";
    }
  });

  clonedDoc.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") ?? "";
    if (src.includes("/_next/image")) {
      try {
        const url = new URL(src, window.location.origin);
        const original = url.searchParams.get("url");
        if (original) {
          img.setAttribute("src", decodeURIComponent(original));
        }
      } catch {
        // Keep the optimizer URL if parsing fails.
      }
    }
    img.style.opacity = "1";
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    img.removeAttribute("srcset");
  });
}

/** True when a canvas row is mostly white / empty (safe page-break zone). */
function isNearlyBlankRow(
  data: Uint8ClampedArray,
  width: number,
  y: number
): boolean {
  const rowStart = y * width * 4;
  let dark = 0;
  const step = Math.max(1, Math.floor(width / 80));
  for (let x = 0; x < width; x += step) {
    const i = rowStart + x * 4;
    const r = data[i] ?? 255;
    const g = data[i + 1] ?? 255;
    const b = data[i + 2] ?? 255;
    if (r < 245 || g < 245 || b < 245) dark += 1;
  }
  return dark <= 2;
}

/**
 * Choose a split Y at or above idealY that does not cut through text.
 * Searches upward for a blank band; falls back to idealY.
 */
function findSafeSplitY(
  canvas: HTMLCanvasElement,
  idealY: number,
  minY: number
): number {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return idealY;
  const { width } = canvas;
  const searchStart = Math.min(idealY, canvas.height - 1);
  const searchEnd = Math.max(minY, idealY - Math.floor((idealY - minY) * 0.9));
  const image = ctx.getImageData(0, 0, width, canvas.height);
  const data = image.data;

  let blankRun = 0;
  for (let y = searchStart; y >= searchEnd; y -= 1) {
    if (isNearlyBlankRow(data, width, y)) {
      blankRun += 1;
      if (blankRun >= 6) {
        return Math.max(minY + 1, y - 2);
      }
    } else {
      blankRun = 0;
    }
  }
  return idealY;
}

function addCanvasSliceToPdf(
  pdf: jsPDF,
  source: HTMLCanvasElement,
  sliceTopPx: number,
  sliceHeightPx: number,
  startNewPage: boolean
) {
  const pageCanvas = document.createElement("canvas");
  pageCanvas.width = source.width;
  pageCanvas.height = Math.max(1, Math.ceil(sliceHeightPx));
  const ctx = pageCanvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the PDF page.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
  ctx.drawImage(
    source,
    0,
    sliceTopPx,
    source.width,
    sliceHeightPx,
    0,
    0,
    source.width,
    sliceHeightPx
  );

  const usableWidth = A4_WIDTH_MM - PDF_MARGIN_MM * 2;
  const renderWidth = usableWidth;
  const renderHeight = renderWidth * (pageCanvas.height / pageCanvas.width);
  const pageHeight = Math.max(A4_HEIGHT_MM, renderHeight + PDF_MARGIN_MM * 2);

  if (startNewPage) {
    pdf.addPage([A4_WIDTH_MM, pageHeight], "portrait");
  } else {
    pdf.internal.pageSize.setWidth(A4_WIDTH_MM);
    pdf.internal.pageSize.setHeight(pageHeight);
  }

  pdf.addImage(
    pageCanvas.toDataURL("image/jpeg", 0.95),
    "JPEG",
    PDF_MARGIN_MM,
    PDF_MARGIN_MM,
    renderWidth,
    renderHeight,
    undefined,
    "FAST"
  );
}

async function downloadScholarshipDocumentPdf(
  root: HTMLElement,
  options: {
    fileStem?: string;
    filePrefix: string;
    captureError: string;
  }
): Promise<void> {
  const restoreClipping = unlockClipping(root);

  try {
    await new Promise((resolve) =>
      window.requestAnimationFrame(() => resolve(undefined))
    );

    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.max(A4_CAPTURE_WIDTH_PX, root.scrollWidth + 32),
      onclone: (_clonedDoc, clonedElement) => {
        prepareCloneForPdf(clonedElement.ownerDocument, clonedElement);
      },
    });

    if (canvas.width < 2 || canvas.height < 2) {
      throw new Error(options.captureError);
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [A4_WIDTH_MM, A4_HEIGHT_MM],
      compress: true,
    });

    const pageHeightPx = Math.floor(
      canvas.width *
        ((A4_HEIGHT_MM - PDF_MARGIN_MM * 2) / (A4_WIDTH_MM - PDF_MARGIN_MM * 2))
    );

    let offset = 0;
    let pageIndex = 0;
    while (offset < canvas.height - 1) {
      const idealEnd = Math.min(offset + pageHeightPx, canvas.height);
      const remaining = canvas.height - offset;
      let splitAt = idealEnd;
      if (remaining > pageHeightPx + 8) {
        splitAt = findSafeSplitY(
          canvas,
          idealEnd,
          offset + Math.floor(pageHeightPx * 0.5)
        );
        if (splitAt <= offset + 24) {
          splitAt = idealEnd;
        }
      }
      const sliceHeight = Math.max(1, splitAt - offset);
      addCanvasSliceToPdf(pdf, canvas, offset, sliceHeight, pageIndex > 0);
      offset = splitAt;
      pageIndex += 1;
      if (pageIndex > 40) break;
    }

    const safeStem = (options.fileStem || "form").replace(/[^\w.-]+/g, "_");
    pdf.save(`${options.filePrefix}-${safeStem}.pdf`);
  } finally {
    restoreClipping();
  }
}

/** Capture the scholarship acceptance document and download a multi-page PDF. */
export async function downloadScholarshipAcceptancePdf(
  root: HTMLElement,
  fileStem?: string
): Promise<void> {
  return downloadScholarshipDocumentPdf(root, {
    fileStem: fileStem || "acceptance",
    filePrefix: "SMECC2E-Scholarship-Acceptance",
    captureError: "Could not capture the acceptance form for PDF.",
  });
}

/** Capture the scholarship agreement document and download a multi-page PDF. */
export async function downloadScholarshipAgreementPdf(
  root: HTMLElement,
  fileStem?: string
): Promise<void> {
  return downloadScholarshipDocumentPdf(root, {
    fileStem: fileStem || "agreement",
    filePrefix: "SMECC2E-Scholarship-Agreement",
    captureError: "Could not capture the agreement form for PDF.",
  });
}

/** Capture the personal & contact update document and download a multi-page PDF. */
export async function downloadPersonalContactPdf(
  root: HTMLElement,
  fileStem?: string
): Promise<void> {
  return downloadScholarshipDocumentPdf(root, {
    fileStem: fileStem || "contact",
    filePrefix: "SMECC2E-Personal-Contact-Update",
    captureError: "Could not capture the personal contact form for PDF.",
  });
}

/** Capture the mobility details confirmation document and download a multi-page PDF. */
export async function downloadMobilityDetailsPdf(
  root: HTMLElement,
  fileStem?: string
): Promise<void> {
  return downloadScholarshipDocumentPdf(root, {
    fileStem: fileStem || "mobility",
    filePrefix: "SMECC2E-Mobility-Details-Confirmation",
    captureError: "Could not capture the mobility details form for PDF.",
  });
}

/** Capture the photo & publication consent document and download a multi-page PDF. */
export async function downloadPhotoPublicationConsentPdf(
  root: HTMLElement,
  fileStem?: string
): Promise<void> {
  return downloadScholarshipDocumentPdf(root, {
    fileStem: fileStem || "consent",
    filePrefix: "SMECC2E-Photo-Publication-Consent",
    captureError: "Could not capture the photo & publication consent form for PDF.",
  });
}
