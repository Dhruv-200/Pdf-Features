"use client";

import { useEffect, useState, useRef } from "react";
import ToolLayout from "../../layouts/ToolLayout";
import FileUpload from "../../components/FileUpload";
import {
    PageTransform,
    applyPageTransforms,
    loadPdfDocument,
    downloadBlob,
} from "../../utils/pdfHelpers";

type PageItem = PageTransform & {
    id: string;
    thumbnail?: string;
};

function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
}

async function generatePageThumbnail(
    pdfDoc: any,
    pageIndex: number,
    rotation: 0 | 90 | 180 | 270,
): Promise<string> {
    try {
        const page = await pdfDoc.getPage(pageIndex);
        const viewport = page.getViewport({ scale: 0.3 }); // Small scale for thumbnails

        // Adjust viewport for rotation
        let width = viewport.width;
        let height = viewport.height;
        if (rotation === 90 || rotation === 270) {
            [width, height] = [height, width];
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");

        if (!context) return "";

        // Apply rotation
        context.save();
        context.translate(width / 2, height / 2);
        context.rotate((rotation * Math.PI) / 180);
        context.translate(-viewport.width / 2, -viewport.height / 2);

        const renderContext = {
            canvasContext: context,
            viewport: viewport,
        };

        await page.render(renderContext).promise;
        context.restore();

        return canvas.toDataURL();
    } catch (err) {
        console.error("Failed to generate thumbnail:", err);
        return "";
    }
}

export default function PageManagerToolPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PageItem[]>([]);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (!file) {
                setPageCount(null);
                setPages([]);
                setPdfDoc(null);
                return;
            }
            try {
                // Load PDF with pdfjs for thumbnails
                // @ts-expect-error - pdfjs-dist types are not fully compatible
                const pdfjsLib = await import("pdfjs-dist/build/pdf");
                if (typeof window !== "undefined") {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                }

                const data = new Uint8Array(await file.arrayBuffer());
                const loadingTask = pdfjsLib.getDocument({ data });
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf);

                const count = pdf.numPages;
                setPageCount(count);
                const items: PageItem[] = Array.from({ length: count }, (_, index) => ({
                    id: `${Date.now()}-${index}`,
                    pageIndex: index,
                    rotation: 0,
                }));
                setPages(items);

                // Generate thumbnails
                setIsLoadingThumbnails(true);
                const thumbnails = await Promise.all(
                    items.map((item) => generatePageThumbnail(pdf, item.pageIndex, 0)),
                );
                setPages((prev) =>
                    prev.map((item, idx) => ({
                        ...item,
                        thumbnail: thumbnails[idx],
                    })),
                );
                setIsLoadingThumbnails(false);
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to read PDF.";
                setError(message);
            }
        };
        void load();
    }, [file]);

    const handleRotate = async (id: string, direction: "left" | "right") => {
        const pageToUpdate = pages.find((p) => p.id === id);
        if (!pageToUpdate) return;

        const delta = direction === "left" ? -90 : 90;
        let next = (pageToUpdate.rotation + delta) % 360;
        if (next < 0) next += 360;
        if (next === 270) next = 270;
        const newRotation = next as 0 | 90 | 180 | 270;
        const updatedPage = { ...pageToUpdate, rotation: newRotation };

        setPages((prev) => prev.map((p) => (p.id === id ? updatedPage : p)));

        // Update thumbnail with new rotation
        if (pdfDoc) {
            const thumbnail = await generatePageThumbnail(
                pdfDoc,
                updatedPage.pageIndex,
                updatedPage.rotation,
            );
            setPages((prev) =>
                prev.map((p) =>
                    p.id === id ? { ...p, thumbnail } : p,
                ),
            );
        }
    };

    const handleDelete = (id: string) => {
        setPages((prev) => prev.filter((p) => p.id !== id));
    };

    const handleApply = async () => {
        if (!file) {
            setError("Please upload a PDF first.");
            return;
        }
        if (!pages.length) {
            setError("There are no pages left to keep.");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const order = pages.map<PageTransform>((p) => ({
                pageIndex: p.pageIndex,
                rotation: p.rotation,
            }));
            const result = await applyPageTransforms(file, order);
            downloadBlob(result, "pages-updated.pdf");
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Failed to generate updated PDF.";
            setError(message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <ToolLayout
            title="Page manager"
            description="Reorder, rotate, or delete pages in your PDF. Preview thumbnails make it easy to see what you're working with. All processing happens locally in your browser."
        >
            <div className="space-y-6">
                <FileUpload
                    label="Select a PDF to manage"
                    description="Choose a single PDF. You can then reorder, rotate, and delete pages."
                    multiple={false}
                    accept=".pdf"
                    onFilesSelected={(files) => {
                        setFile(files[0] ?? null);
                        setError(null);
                    }}
                />

                {pageCount !== null && (
                    <p className="text-xs text-zinc-400">
                        Original document has{" "}
                        <span className="font-semibold">{pageCount}</span> pages.
                        {isLoadingThumbnails && (
                            <span className="ml-2 text-emerald-400">
                                Loading thumbnails...
                            </span>
                        )}
                    </p>
                )}

                {pages.length > 0 && (
                    <div className="space-y-2">
                        <h2 className="text-sm font-medium text-zinc-200">
                            Pages (drag to reorder)
                        </h2>
                        <div className="max-h-[600px] space-y-2 overflow-auto rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-3">
                            {pages.map((page, index) => (
                                <div
                                    key={page.id}
                                    draggable
                                    onDragStart={() => setDragIndex(index)}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.add("opacity-50");
                                    }}
                                    onDragLeave={(e) => {
                                        e.currentTarget.classList.remove("opacity-50");
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove("opacity-50");
                                        if (dragIndex === null || dragIndex === index) return;
                                        setPages((prev) => reorder(prev, dragIndex, index));
                                        setDragIndex(null);
                                    }}
                                    className={`flex items-center gap-4 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-3 transition-all hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md ${dragIndex === index ? "opacity-50" : ""
                                        }`}
                                >
                                    <div className="flex-shrink-0">
                                        {page.thumbnail ? (
                                            <img
                                                src={page.thumbnail}
                                                alt={`Page ${page.pageIndex + 1}`}
                                                className="w-20 h-28 object-contain border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-20 h-28 flex items-center justify-center border border-zinc-300 dark:border-zinc-600 rounded bg-zinc-100 dark:bg-zinc-800">
                                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                    Loading...
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col gap-1">
                                        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                                            Page {page.pageIndex + 1}
                                        </span>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                            Position: {index + 1} of {pages.length} · Rotation: {page.rotation}°
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleRotate(page.id, "left")}
                                            className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                                            title="Rotate left 90°"
                                        >
                                            ↺ Left
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRotate(page.id, "right")}
                                            className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                                            title="Rotate right 90°"
                                        >
                                            ↻ Right
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(page.id)}
                                            className="rounded-md bg-red-100 dark:bg-red-900/40 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                                            title="Delete page"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Drag rows to change page order. Rotate pages as needed or delete
                            them. The updated PDF will reflect this final list.
                        </p>
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
                    disabled={isProcessing || !file || !pages.length}
                    className="w-full inline-flex items-center justify-center rounded-md bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-emerald-200 transition-colors shadow-lg shadow-emerald-500/20"
                >
                    {isProcessing ? "Generating PDF…" : "Generate updated PDF"}
                </button>
            </div>
        </ToolLayout>
    );
}
