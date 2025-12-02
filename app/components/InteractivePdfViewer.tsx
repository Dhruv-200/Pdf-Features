"use client";

import { useEffect, useState, useRef } from "react";

type TextItem = {
    page: number;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    width: number;
    height: number;
};

type InteractivePdfViewerProps = {
    file: File;
    onTextClick: (textItem: TextItem) => void;
    edits: Array<{
        pageNumber: number;
        originalText: string;
        editedText: string;
    }>;
};

export default function InteractivePdfViewer({
    file,
    onTextClick,
    edits,
}: InteractivePdfViewerProps) {
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [textItems, setTextItems] = useState<TextItem[]>([]);
    const [scale, setScale] = useState<number>(1.5);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadPdf = async () => {
            if (!file) return;

            setIsLoading(true);
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

                // Extract text items from all pages
                const allTextItems: TextItem[] = [];
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
                    const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 1 });
                    const content = await page.getTextContent();

                    for (const item of content.items) {
                        if ("str" in item && item.str && item.str.trim()) {
                            const transform = (item as any).transform as number[];
                            if (transform && transform.length >= 6) {
                                const fontSize = transform[0] || 12;
                                const x = transform[4] || 0;
                                const y = transform[5] || 0;
                                const text = item.str;

                                allTextItems.push({
                                    page: pageNum,
                                    text,
                                    x,
                                    y: viewport.height - y, // Convert to bottom-left origin
                                    fontSize,
                                    width: text.length * fontSize * 0.6,
                                    height: fontSize,
                                });
                            }
                        }
                    }
                }
                setTextItems(allTextItems);
            } catch (err) {
                console.error("Failed to load PDF:", err);
            } finally {
                setIsLoading(false);
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
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Convert canvas click coordinates to PDF coordinates
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const pdfX = clickX * scaleX;
        const pdfY = clickY * scaleY;

        // Find the closest text item on the current page
        const pageTextItems = textItems.filter((item) => item.page === currentPage);
        let closestItem: TextItem | null = null;
        let minDistance = Infinity;

        for (const item of pageTextItems) {
            // Check if click is within text bounds (with some tolerance)
            const tolerance = 20;
            const distance = Math.sqrt(
                Math.pow(pdfX - item.x, 2) + Math.pow(pdfY - item.y, 2),
            );

            if (
                distance < minDistance &&
                pdfX >= item.x - tolerance &&
                pdfX <= item.x + item.width + tolerance &&
                pdfY >= item.y - tolerance &&
                pdfY <= item.y + item.height + tolerance
            ) {
                minDistance = distance;
                closestItem = item;
            }
        }

        if (closestItem) {
            onTextClick(closestItem);
        }
    };

    const getCurrentPageTextItems = () => {
        return textItems.filter((item) => item.page === currentPage);
    };

    const getEditedText = (originalText: string) => {
        const edit = edits.find(
            (e) => e.pageNumber === currentPage && e.originalText === originalText,
        );
        return edit ? edit.editedText : originalText;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-2"></div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading PDF...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
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
                        className="cursor-pointer block"
                        style={{ maxWidth: "100%" }}
                    />
                    {/* Overlay text items for click detection */}
                    {getCurrentPageTextItems().map((item, index) => {
                        if (!canvasRef.current) return null;
                        const rect = canvasRef.current.getBoundingClientRect();
                        const scaleX = rect.width / canvasRef.current.width;
                        const scaleY = rect.height / canvasRef.current.height;
                        const x = item.x * scaleX;
                        const y = item.y * scaleY;
                        const isEdited = edits.some(
                            (e) =>
                                e.pageNumber === currentPage &&
                                e.originalText === item.text,
                        );

                        return (
                            <div
                                key={index}
                                className="absolute pointer-events-none"
                                style={{
                                    left: `${x}px`,
                                    top: `${y}px`,
                                    transform: "translateY(-100%)",
                                }}
                            >
                                <div
                                    className={`px-1 py-0.5 rounded text-xs font-medium transition-all ${isEdited
                                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                        : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 opacity-0 hover:opacity-100"
                                        }`}
                                    style={{
                                        fontSize: `${item.fontSize * scaleX}px`,
                                    }}
                                >
                                    {getEditedText(item.text)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                Click on any text in the PDF to edit it
            </p>
        </div>
    );
}


