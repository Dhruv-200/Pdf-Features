"use client";

import { useEffect, useState, useRef } from "react";
import { PDFDocument, StandardFonts } from "pdf-lib";
import ToolLayout from "../../layouts/ToolLayout";
import FileUpload from "../../components/FileUpload";
import { downloadBlob, readFileAsArrayBuffer } from "../../utils/pdfHelpers";

type Annotation = {
    id: string;
    pageNumber: number;
    text: string;
    x: number; // PDF coordinates
    y: number; // PDF coordinates
    fontSize: number;
};

async function applyAnnotations(options: {
    file: File;
    annotations: Annotation[];
}): Promise<Uint8Array> {
    const buffer = await readFileAsArrayBuffer(options.file);
    const pdfDoc = await PDFDocument.load(buffer);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const grouped = new Map<number, Annotation[]>();
    for (const ann of options.annotations) {
        const list = grouped.get(ann.pageNumber) ?? [];
        list.push(ann);
        grouped.set(ann.pageNumber, list);
    }

    for (const [pageNumber, anns] of grouped.entries()) {
        const page = pdfDoc.getPage(pageNumber - 1);
        const { height } = page.getSize();

        for (const ann of anns) {
            // Convert y coordinate (PDF uses bottom-left origin, canvas uses top-left)
            const pdfY = height - ann.y;

            page.drawText(ann.text, {
                x: ann.x,
                y: pdfY,
                size: ann.fontSize,
                font,
            });
        }
    }

    return pdfDoc.save();
}

export default function TextAnnotationsToolPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState<number>(1.5);
    const [annotationText, setAnnotationText] = useState<string>("");
    const [fontSize, setFontSize] = useState<number>(12);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        const loadPdf = async () => {
            if (!file) {
                setPageCount(0);
                setPdfDoc(null);
                setAnnotations([]);
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
                setAnnotations([]);
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

        // Check if clicking on existing annotation
        const existingAnnotation = annotations.find(
            (ann) =>
                ann.pageNumber === currentPage &&
                Math.abs(ann.x - pdfX) < 50 &&
                Math.abs(ann.y - pdfY) < 50,
        );

        if (existingAnnotation) {
            // Edit existing annotation
            setEditingId(existingAnnotation.id);
            setTimeout(() => {
                const input = inputRefs.current.get(existingAnnotation.id);
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 10);
            return;
        }

        // Create new annotation
        const defaultText = annotationText.trim() || "Annotation";
        const ann: Annotation = {
            id: `annotation-${Date.now()}`,
            pageNumber: currentPage,
            text: defaultText,
            x: pdfX,
            y: pdfY,
            fontSize,
        };

        setAnnotations((prev) => [...prev, ann]);
        setEditingId(ann.id);
        setTimeout(() => {
            const input = inputRefs.current.get(ann.id);
            if (input) {
                input.focus();
                if (defaultText === "Annotation") {
                    input.select();
                }
            }
        }, 10);
    };

    const handleAnnotationChange = (id: string, value: string) => {
        setAnnotations((prev) =>
            prev.map((ann) => (ann.id === id ? { ...ann, text: value } : ann)),
        );
    };

    const handleAnnotationBlur = (id: string) => {
        setAnnotations((prev) => {
            const ann = prev.find((a) => a.id === id);
            if (ann && !ann.text.trim()) {
                // Remove empty annotations
                return prev.filter((a) => a.id !== id);
            }
            return prev;
        });
        setEditingId(null);
    };

    const handleAnnotationKeyDown = (id: string, e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAnnotationBlur(id);
        } else if (e.key === "Escape") {
            const ann = annotations.find((a) => a.id === id);
            if (ann && ann.text === "Annotation") {
                // Remove placeholder annotation on escape
                setAnnotations((prev) => prev.filter((a) => a.id !== id));
            } else {
                handleAnnotationBlur(id);
            }
        }
    };

    const removeAnnotation = (id: string) => {
        setAnnotations((prev) => prev.filter((a) => a.id !== id));
        if (editingId === id) {
            setEditingId(null);
        }
    };

    const handleApply = async () => {
        if (!file) {
            setError("Upload a PDF first.");
            return;
        }
        const validAnnotations = annotations.filter((a) => a.text.trim());
        if (!validAnnotations.length) {
            setError("Add at least one annotation.");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const data = await applyAnnotations({ file, annotations: validAnnotations });
            downloadBlob(data, "annotated.pdf");
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to apply annotations.";
            setError(message);
        } finally {
            setIsProcessing(false);
        }
    };

    const getAnnotationsForCurrentPage = () => {
        return annotations.filter((ann) => ann.pageNumber === currentPage);
    };

    return (
        <ToolLayout
            title="Text Annotations"
            description="Click anywhere on the PDF to add annotations. Click on existing annotations to edit them. Configure default text and font size below."
        >
            <div className="space-y-6">
                <FileUpload
                    label="Select a PDF"
                    description="Choose a PDF file to annotate."
                    multiple={false}
                    accept=".pdf"
                    onFilesSelected={(files) => {
                        setFile(files[0] ?? null);
                        setAnnotations([]);
                        setError(null);
                    }}
                />

                {file && pdfDoc && (
                    <>
                        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                                Annotation Settings
                            </h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Default Annotation Text
                                    </label>
                                    <input
                                        type="text"
                                        value={annotationText}
                                        onChange={(e) => setAnnotationText(e.target.value)}
                                        placeholder="Enter default text..."
                                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                                    />
                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                        Leave empty to use "Annotation" as default
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Font Size: {fontSize}pt
                                    </label>
                                    <input
                                        type="range"
                                        min="8"
                                        max="24"
                                        value={fontSize}
                                        onChange={(e) =>
                                            setFontSize(Number.parseInt(e.target.value, 10))
                                        }
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                                Click anywhere on the PDF below to add annotations. Click on existing annotations to edit them.
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
                                {/* Render annotation overlays */}
                                {getAnnotationsForCurrentPage().map((ann) => {
                                    if (!canvasRef.current) return null;
                                    const rect = canvasRef.current.getBoundingClientRect();
                                    const scaleX = rect.width / canvasRef.current.width;
                                    const scaleY = rect.height / canvasRef.current.height;
                                    const x = ann.x * scaleX;
                                    const y = ann.y * scaleY;
                                    const isEditing = editingId === ann.id;

                                    return (
                                        <div
                                            key={ann.id}
                                            className="absolute"
                                            style={{
                                                left: `${x}px`,
                                                top: `${y}px`,
                                                transform: "translate(-50%, -100%)",
                                            }}
                                        >
                                            <input
                                                ref={(el) => {
                                                    if (el) {
                                                        inputRefs.current.set(ann.id, el);
                                                    } else {
                                                        inputRefs.current.delete(ann.id);
                                                    }
                                                }}
                                                type="text"
                                                value={ann.text}
                                                onChange={(e) =>
                                                    handleAnnotationChange(ann.id, e.target.value)
                                                }
                                                onBlur={() => handleAnnotationBlur(ann.id)}
                                                onKeyDown={(e) =>
                                                    handleAnnotationKeyDown(ann.id, e)
                                                }
                                                onClick={(e) => e.stopPropagation()}
                                                className={`px-2 py-1 rounded text-xs font-medium border-2 transition-all ${isEditing
                                                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-emerald-500 shadow-lg z-50"
                                                    : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100 border-emerald-300 dark:border-emerald-700"
                                                    }`}
                                                style={{
                                                    fontSize: `${ann.fontSize * scaleX}px`,
                                                    minWidth: "80px",
                                                }}
                                            />
                                            {!isEditing && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeAnnotation(ann.id);
                                                    }}
                                                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center hover:bg-red-600 z-10"
                                                    title="Remove"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                            Click anywhere on the PDF to add annotations. Click on existing annotations to edit them. Press Enter to save, Escape to cancel.
                        </p>
                    </>
                )}

                {annotations.filter((a) => a.text.trim()).length > 0 && (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4">
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                            All Annotations ({annotations.filter((a) => a.text.trim()).length})
                        </h2>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {annotations
                                .filter((a) => a.text.trim())
                                .map((ann) => (
                                    <div
                                        key={ann.id}
                                        className="flex items-center justify-between rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2"
                                    >
                                        <div className="flex-1">
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                Page {ann.pageNumber} · Size: {ann.fontSize}pt
                                            </span>
                                            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 mt-1">
                                                {ann.text}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCurrentPage(ann.pageNumber);
                                                    setEditingId(ann.id);
                                                    setTimeout(() => {
                                                        const input = inputRefs.current.get(ann.id);
                                                        if (input) {
                                                            input.focus();
                                                            input.select();
                                                        }
                                                    }, 100);
                                                }}
                                                className="text-xs text-emerald-400 hover:text-emerald-300"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeAnnotation(ann.id)}
                                                className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-red-400 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-3">
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleApply}
                    disabled={
                        isProcessing ||
                        !file ||
                        !annotations.filter((a) => a.text.trim()).length
                    }
                    className="w-full inline-flex items-center justify-center rounded-md bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-emerald-200 transition-colors shadow-lg shadow-emerald-500/20"
                >
                    {isProcessing
                        ? "Generating annotated PDF…"
                        : `Generate Annotated PDF${annotations.filter((a) => a.text.trim()).length > 0 ? ` (${annotations.filter((a) => a.text.trim()).length})` : ""}`}
                </button>
            </div>
        </ToolLayout>
    );
}
