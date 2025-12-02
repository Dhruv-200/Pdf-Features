"use client";

import { useEffect, useState, useRef } from "react";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import ToolLayout from "../../layouts/ToolLayout";
import FileUpload from "../../components/FileUpload";
import { downloadBlob, readFileAsArrayBuffer } from "../../utils/pdfHelpers";

type Watermark = {
    id: string;
    pageNumber: number;
    text: string;
    x: number; // PDF coordinates
    y: number; // PDF coordinates
    fontSize: number;
    angle: number;
    opacity: number;
};

async function applyTextWatermark(options: {
    file: File;
    watermarks: Watermark[];
}): Promise<Uint8Array> {
    const buffer = await readFileAsArrayBuffer(options.file);
    const pdfDoc = await PDFDocument.load(buffer);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const grouped = new Map<number, Watermark[]>();
    for (const watermark of options.watermarks) {
        const list = grouped.get(watermark.pageNumber) ?? [];
        list.push(watermark);
        grouped.set(watermark.pageNumber, list);
    }

    for (const [pageNumber, watermarks] of grouped.entries()) {
        const page = pdfDoc.getPage(pageNumber - 1);
        const { height } = page.getSize();

        for (const watermark of watermarks) {
            // Convert y coordinate (PDF uses bottom-left origin)
            const pdfY = height - watermark.y;

            page.drawText(watermark.text, {
                x: watermark.x,
                y: pdfY,
                size: watermark.fontSize,
                font,
                color: rgb(0.8, 0.8, 0.8),
                rotate: degrees(watermark.angle),
                opacity: watermark.opacity,
            });
        }
    }

    return pdfDoc.save();
}

export default function WatermarkTextToolPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [watermarks, setWatermarks] = useState<Watermark[]>([]);
    const [text, setText] = useState<string>("CONFIDENTIAL");
    const [fontSize, setFontSize] = useState<number>(48);
    const [angle, setAngle] = useState<number>(45);
    const [opacity, setOpacity] = useState<number>(0.2);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState<number>(1.5);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const loadPdf = async () => {
            if (!file) {
                setPdfDoc(null);
                setWatermarks([]);
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
                setWatermarks([]);
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to read PDF.";
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
            } catch (err) {
                console.error("Failed to render page:", err);
            }
        };

        void renderPage();
    }, [pdfDoc, currentPage, scale]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current || !text.trim()) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Convert canvas click coordinates to PDF coordinates
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const pdfX = clickX * scaleX;
        const pdfY = clickY * scaleY;

        const watermark: Watermark = {
            id: `watermark-${Date.now()}`,
            pageNumber: currentPage,
            text: text.trim(),
            x: pdfX,
            y: pdfY,
            fontSize,
            angle,
            opacity,
        };

        setWatermarks((prev) => [...prev, watermark]);
    };

    const removeWatermark = (id: string) => {
        setWatermarks((prev) => prev.filter((w) => w.id !== id));
    };

    const handleApply = async () => {
        if (!file) {
            setError("Please upload a PDF first.");
            return;
        }
        if (!watermarks.length) {
            setError("Add at least one watermark by clicking on the PDF.");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const data = await applyTextWatermark({ file, watermarks });
            downloadBlob(data, "watermarked-text.pdf");
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to apply watermark.";
            setError(message);
        } finally {
            setIsProcessing(false);
        }
    };

    const getCurrentPageWatermarks = () => {
        return watermarks.filter((w) => w.pageNumber === currentPage);
    };

    return (
        <ToolLayout
            title="Add text watermark"
            description="Click anywhere on the PDF to place watermarks. Configure the text, size, rotation, and opacity, then click on the PDF where you want each watermark to appear."
        >
            <div className="space-y-6">
                <FileUpload
                    label="Select a PDF"
                    description="Choose a single PDF to watermark."
                    multiple={false}
                    accept=".pdf"
                    onFilesSelected={(files) => {
                        setFile(files[0] ?? null);
                        setError(null);
                    }}
                />

                {file && pdfDoc && (
                    <>
                        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                                Watermark Settings
                            </h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Watermark text
                                    </label>
                                    <input
                                        type="text"
                                        value={text}
                                        onChange={(e) => setText(e.target.value)}
                                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                                        placeholder="CONFIDENTIAL"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Font size: {fontSize}pt
                                    </label>
                                    <input
                                        type="range"
                                        min="8"
                                        max="200"
                                        value={fontSize}
                                        onChange={(e) =>
                                            setFontSize(Number.parseInt(e.target.value, 10))
                                        }
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Rotation: {angle}°
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="360"
                                        value={angle}
                                        onChange={(e) =>
                                            setAngle(Number.parseInt(e.target.value, 10))
                                        }
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Opacity: {Math.round(opacity * 100)}%
                                    </label>
                                    <input
                                        type="range"
                                        min="0.05"
                                        max="1"
                                        step="0.05"
                                        value={opacity}
                                        onChange={(e) =>
                                            setOpacity(Number.parseFloat(e.target.value))
                                        }
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                                Configure your watermark settings above, then click anywhere on the PDF below to place watermarks.
                            </p>
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
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
                                    className="px-2 py-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                                >
                                    −
                                </button>
                                <span className="text-xs text-zinc-600 dark:text-zinc-400 w-12 text-center">
                                    {Math.round(scale * 100)}%
                                </span>
                                <button
                                    onClick={() => setScale((s) => Math.min(3, s + 0.25))}
                                    className="px-2 py-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div
                            ref={containerRef}
                            className="relative border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 overflow-auto shadow-lg"
                            style={{ maxHeight: "70vh" }}
                        >
                            <div className="relative inline-block">
                                <canvas
                                    ref={canvasRef}
                                    onClick={handleCanvasClick}
                                    className="cursor-crosshair block"
                                    style={{ maxWidth: "100%" }}
                                />
                                {/* Render watermark markers */}
                                {getCurrentPageWatermarks().map((watermark) => {
                                    if (!canvasRef.current) return null;
                                    const rect = canvasRef.current.getBoundingClientRect();
                                    const scaleX = rect.width / canvasRef.current.width;
                                    const scaleY = rect.height / canvasRef.current.height;
                                    const x = watermark.x * scaleX;
                                    const y = watermark.y * scaleY;

                                    return (
                                        <div
                                            key={watermark.id}
                                            className="absolute pointer-events-none"
                                            style={{
                                                left: `${x}px`,
                                                top: `${y}px`,
                                                transform: `translate(-50%, -50%) rotate(${watermark.angle}deg)`,
                                            }}
                                        >
                                            <div
                                                className="px-2 py-1 rounded text-xs font-bold text-zinc-700 dark:text-zinc-300 border-2 border-emerald-500 bg-emerald-100/80 dark:bg-emerald-900/50"
                                                style={{
                                                    fontSize: `${watermark.fontSize * scaleX}px`,
                                                    opacity: watermark.opacity,
                                                }}
                                            >
                                                {watermark.text}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeWatermark(watermark.id);
                                                }}
                                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center hover:bg-red-600 pointer-events-auto z-10"
                                                title="Remove"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                            Click anywhere on the PDF to place a watermark. Click the × on a watermark to remove it.
                        </p>
                    </>
                )}

                {watermarks.length > 0 && (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4">
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                            Watermarks ({watermarks.length})
                        </h2>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {watermarks.map((watermark) => (
                                <div
                                    key={watermark.id}
                                    className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2"
                                >
                                    <div className="flex-1">
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                            Page {watermark.pageNumber}
                                        </span>
                                        <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 mt-1">
                                            {watermark.text} · {watermark.fontSize}pt · {watermark.angle}° · {Math.round(watermark.opacity * 100)}%
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCurrentPage(watermark.pageNumber);
                                            removeWatermark(watermark.id);
                                        }}
                                        className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-3">
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleApply}
                    disabled={isProcessing || !file || !watermarks.length}
                    className="w-full inline-flex items-center justify-center rounded-md bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-emerald-200 transition-colors shadow-lg shadow-emerald-500/20"
                >
                    {isProcessing ? "Applying watermark…" : `Apply Watermarks (${watermarks.length})`}
                </button>
            </div>
        </ToolLayout>
    );
}
