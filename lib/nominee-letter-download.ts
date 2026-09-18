"use client";

import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/** A4 portrait size in millimetres. */
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
/** Outer margin around each letter page on the PDF (mm). */
const PDF_MARGIN_MM = 12;
/** CSS pixel width used to capture each page at A4 proportions (~96dpi). */
const A4_CAPTURE_WIDTH_PX = Math.round((A4_WIDTH_MM / 25.4) * 96);
/** Body text size used in the downloaded PDF. */
const PDF_FONT_SIZE_PX = 12;

type StyleSnapshot = {
  el: HTMLElement;
  overflow: string;
  maxHeight: string;
};

/** Temporarily unlock overflow so full letter pages are capturable. */
function unlockOverflowAncestors(root: HTMLElement): () => void {
  const snapshots: StyleSnapshot[] = [];
  let node: HTMLElement | null = root;
  while (node) {
    const style = window.getComputedStyle(node);
    if (
      style.overflow !== "visible" ||
      style.overflowY !== "visible" ||
      style.maxHeight !== "none"
    ) {
      snapshots.push({
        el: node,
        overflow: node.style.overflow,
        maxHeight: node.style.maxHeight,
      });
      node.style.overflow = "visible";
      node.style.maxHeight = "none";
    }
    node = node.parentElement;
  }
  return () => {
    for (const snap of snapshots) {
      snap.el.style.overflow = snap.overflow;
      snap.el.style.maxHeight = snap.maxHeight;
    }
  };
}

/** Prepare a cloned page node as a single A4 sheet for capture. */
function prepareCloneForPdf(clonedDoc: Document, clonedElement: HTMLElement) {
  clonedDoc.querySelectorAll("[data-pdf-exclude]").forEach((el) => {
    (el as HTMLElement).style.display = "none";
  });
  clonedDoc.querySelectorAll("button").forEach((el) => {
    el.style.display = "none";
  });

  // Lay out each letter page at A4 width so pagination maps 1:1.
  clonedElement.style.boxSizing = "border-box";
  clonedElement.style.width = `${A4_CAPTURE_WIDTH_PX}px`;
  clonedElement.style.maxWidth = `${A4_CAPTURE_WIDTH_PX}px`;
  clonedElement.style.boxShadow = "none";
  clonedElement.style.borderRadius = "0";
  clonedElement.style.border = "none";
  clonedElement.style.minHeight = "0";
  clonedElement.style.height = "auto";
  clonedElement.style.padding = "16px 20px";
  clonedElement.style.margin = "0";
  clonedElement.style.background = "#ffffff";

  const content = clonedElement.querySelector<HTMLElement>(":scope > div");
  if (content) {
    content.style.flex = "none";
    content.style.paddingTop = "12px";
    content.style.paddingBottom = "12px";
  }

  const footer = clonedElement.querySelector<HTMLElement>(":scope > footer");
  if (footer) {
    footer.style.marginTop = "12px";
  }

  // Force body copy to 12px for the PDF capture.
  clonedElement.style.fontSize = `${PDF_FONT_SIZE_PX}px`;
  clonedElement.style.lineHeight = "1.55";
  clonedElement.querySelectorAll<HTMLElement>("*").forEach((el) => {
    if (el.tagName === "IMG" || el.tagName === "SVG" || el.tagName === "PATH") {
      return;
    }
    el.style.fontSize = `${PDF_FONT_SIZE_PX}px`;
    el.style.lineHeight = "1.55";
  });

  // Prefer original public image URLs over Next.js optimizer URLs when present.
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
    img.removeAttribute("srcset");
  });

  // Render form controls as plain text so values always show in the PDF.
  clonedElement.querySelectorAll("input, textarea, select").forEach((el) => {
    const control = el as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement;
    const text = document.createElement("span");
    text.textContent =
      control instanceof HTMLSelectElement
        ? (control.options[control.selectedIndex]?.text ?? control.value)
        : control.value;
    text.style.cssText = `display:inline-block;min-width:4rem;padding:0.15rem 0.35rem;border-bottom:1px solid #94a3b8;font-size:${PDF_FONT_SIZE_PX}px;line-height:1.55;font-weight:600;color:#0f172a;white-space:pre-wrap;`;
    control.replaceWith(text);
  });
}

/**
 * Place one letter-page capture onto exactly one A4 PDF page,
 * scaled to fit inside the margins (contain).
 */
function addA4PageImage(
  pdf: jsPDF,
  imageData: string,
  canvasWidthPx: number,
  canvasHeightPx: number,
  startNewPage: boolean
) {
  const usableWidth = A4_WIDTH_MM - PDF_MARGIN_MM * 2;
  const usableHeight = A4_HEIGHT_MM - PDF_MARGIN_MM * 2;
  const aspect = canvasHeightPx / canvasWidthPx;

  let renderWidth = usableWidth;
  let renderHeight = renderWidth * aspect;
  if (renderHeight > usableHeight) {
    renderHeight = usableHeight;
    renderWidth = renderHeight / aspect;
  }

  const x = (A4_WIDTH_MM - renderWidth) / 2;
  const y = PDF_MARGIN_MM;

  if (startNewPage) {
    pdf.addPage([A4_WIDTH_MM, A4_HEIGHT_MM], "portrait");
  }

  pdf.addImage(
    imageData,
    "JPEG",
    x,
    y,
    renderWidth,
    renderHeight,
    undefined,
    "FAST"
  );
}

/** Capture each letter page in the modal and download a multi-page A4 PDF. */
export async function downloadNomineeAgreementPdf(
  root: HTMLElement,
  fileStem?: string
): Promise<void> {
  const pages = Array.from(
    root.querySelectorAll<HTMLElement>("[data-nominee-letter-page]")
  ).sort((a, b) => {
    const left = Number(a.dataset.nomineeLetterPage ?? 0);
    const right = Number(b.dataset.nomineeLetterPage ?? 0);
    return left - right;
  });

  if (pages.length === 0) {
    throw new Error("Could not find agreement pages to export.");
  }

  const restoreOverflow = unlockOverflowAncestors(root);

  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [A4_WIDTH_MM, A4_HEIGHT_MM],
      compress: true,
    });
    let wrotePage = false;

    for (const page of pages) {
      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        width: A4_CAPTURE_WIDTH_PX,
        windowWidth: A4_CAPTURE_WIDTH_PX,
        onclone: (_clonedDoc, clonedElement) => {
          prepareCloneForPdf(clonedElement.ownerDocument, clonedElement);
        },
      });

      // Skip accidental empty captures.
      if (canvas.width < 2 || canvas.height < 2) continue;

      const imageData = canvas.toDataURL("image/jpeg", 0.92);
      addA4PageImage(
        pdf,
        imageData,
        canvas.width,
        canvas.height,
        wrotePage
      );
      wrotePage = true;
    }

    if (!wrotePage) {
      throw new Error("Could not capture any agreement pages for the PDF.");
    }

    const safeStem = (fileStem || "agreement").replace(/[^\w.-]+/g, "_");
    pdf.save(`SMECC2E-Scholarship-Agreement-${safeStem}.pdf`);
  } finally {
    restoreOverflow();
  }
}
