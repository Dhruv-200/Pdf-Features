"use client";

import { useState, useEffect, useRef } from "react";
import ToolLayout from "../../layouts/ToolLayout";
import FileUpload from "../../components/FileUpload";

export default function PdfToImagesToolPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [imageFormat, setImageFormat] = useState<"png" | "jpg">("png");
    const [scale, setScale] = useState<number>(2);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [pageImage, setPageImage] = useState<string | null>(null);

    useEffect(() => {
        const loadPdf = async () => {
            if (!file) {
                setPdfDoc(null);
                setPageCount(null);
                setPageImage(null);
                return;
            }
            try {
                // @ts-expect-error - pdfjs-dist types are not fully compatible
                const pdfjsLib = await import("pdfjs-dist/build/pdf");
                if (typeof window !== "undefined") {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                }

                const data = new Uint8Array(await file.arrayBuffer());
                const loadingTask = pdfjsLib.getDocument({ data });
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf);
                setPageCount(pdf.numPages);
                setCurrentPage(1);
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to load PDF.";
                setError(message);
            }
        };
        void loadPdf();
    }, [file]);

    useEffect(() => {
        const renderPage = async () => {
            if (!pdfDoc || !canvasRef.current) return;

            try {
                const page = await pdfDoc.getPage(currentPage);
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const context = canvas.getContext("2d");

                if (!context) return;

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                await page.render(renderContext).promise;
                setPageImage(canvas.toDataURL(`image/${imageFormat}`, imageFormat === "jpg" ? 0.92 : undefined));
            } catch (err) {
                console.error("Failed to render page:", err);
            }
        };

        void renderPage();
    }, [pdfDoc, currentPage, scale, imageFormat]);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const downloadCurrentPage = () => {
        if (!pageImage) return;
        const link = document.createElement("a");
        link.href = pageImage;
        link.download = `${file?.name.replace(".pdf", "") || "page"}-${currentPage}.${imageFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadAllPages = async () => {
        if (!pdfDoc || !file) return;

        setIsProcessing(true);
        setError(null);

        try {
            // Download all pages one by one
            for (let pageNum = 1; pageNum <= pageCount!; pageNum += 1) {
                const page = await pdfDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale });
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");

                if (!context) continue;

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                await page.render(renderContext).promise;
                const imageData = canvas.toDataURL(`image/${imageFormat}`, imageFormat === "jpg" ? 0.92 : undefined);

                // Convert base64 to blob
                const response = await fetch(imageData);
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${file.name.replace(".pdf", "")}-page-${pageNum}.${imageFormat}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // Small delay between downloads to avoid browser blocking
                if (pageNum < pageCount!) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to convert PDF to images.";
            setError(message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <ToolLayout
            title="PDF to Images"
            description="Convert PDF pages to PNG or JPG images. Download individual pages or all pages at once."
        >
            <div className="space-y-6">
                <FileUpload
                    label="Select a PDF"
                    description="Choose a PDF file to convert to images."
                    multiple={false}
                    accept=".pdf"
                    onFilesSelected={(files) => {
                        setFile(files[0] ?? null);
                        setError(null);
                    }}
                />

                {pdfDoc && pageCount !== null && (
                    <>
                        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                                Conversion Settings
                            </h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Image Format
                                    </label>
                                    <select
                                        value={imageFormat}
                                        onChange={(e) => setImageFormat(e.target.value as "png" | "jpg")}
                                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
                                    >
                                        <option value="png">PNG (Better Quality)</option>
                                        <option value="jpg">JPG (Smaller Size)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Scale: {scale}x
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="4"
                                        step="0.5"
                                        value={scale}
                                        onChange={(e) => setScale(Number.parseFloat(e.target.value))}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Higher scale = better quality, larger file size
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    ← Prev
                                </button>
                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Page {currentPage} of {pageCount}
                                </span>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                                    disabled={currentPage === pageCount}
                                    className="px-3 py-1.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>

                        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                            <canvas
                                ref={canvasRef}
                                className="block w-full"
                                style={{ display: pageImage ? "block" : "none" }}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={downloadCurrentPage}
                                disabled={!pageImage}
                                className="flex-1 inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-emerald-200 transition-colors"
                            >
                                Download Current Page
                            </button>
                            <button
                                type="button"
                                onClick={downloadAllPages}
                                disabled={isProcessing || !pdfDoc}
                                className="flex-1 inline-flex items-center justify-center rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-teal-950 hover:bg-teal-400 disabled:cursor-not-allowed disabled:bg-teal-800 disabled:text-teal-200 transition-colors"
                            >
                                {isProcessing ? "Converting…" : `Download All Pages`}
                            </button>
                        </div>
                    </>
                )}

                {error && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-3">
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}
            </div>
        </ToolLayout>
    );
}

