"use client";

import { useEffect, useState, useRef } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import ToolLayout from "../../layouts/ToolLayout";
import FileUpload from "../../components/FileUpload";
import { downloadBlob, readFileAsArrayBuffer } from "../../utils/pdfHelpers";

type TextEdit = {
    id: string;
    pageNumber: number;
    originalText: string | null; // null means new text
    editedText: string;
    x: number;
    y: number;
    fontSize: number;
};

type TextItem = {
    page: number;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    width: number;
    height: number;
};

async function applyTextEdits(
    file: File,
    edits: TextEdit[],
): Promise<Uint8Array> {
    const buffer = await readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(buffer);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const grouped = new Map<number, TextEdit[]>();
    for (const edit of edits) {
        const list = grouped.get(edit.pageNumber) ?? [];
        list.push(edit);
        grouped.set(edit.pageNumber, list);
    }

    for (const [pageNumber, pageEdits] of grouped.entries()) {
        const page = pdfDoc.getPage(pageNumber - 1);
        const { height } = page.getSize();

        for (const edit of pageEdits) {
            if (edit.originalText !== null) {
                // Edit existing text - erase original
                const textWidth = font.widthOfTextAtSize(edit.originalText, edit.fontSize);
                const textHeight = edit.fontSize;

                // Draw white rectangle to "erase" original text
                page.drawRectangle({
                    x: edit.x - 2,
                    y: height - edit.y - textHeight - 2,
                    width: textWidth + 4,
                    height: textHeight + 4,
                    color: rgb(1, 1, 1),
                });
            }

            // Draw new/edited text
            const pdfY = height - edit.y;
            page.drawText(edit.editedText, {
                x: edit.x,
                y: pdfY,
                size: edit.fontSize,
                font,
                color: rgb(0, 0, 0),
            });
        }
    }

    return pdfDoc.save();
}

export default function EditPdfToolPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [textItems, setTextItems] = useState<TextItem[]>([]);
    const [edits, setEdits] = useState<TextEdit[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState<number>(1.5);
    const [fontSize, setFontSize] = useState<number>(12);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

    useEffect(() => {
        const loadPdf = async () => {
            if (!file) {
                setPdfDoc(null);
                setTextItems([]);
                setEdits([]);
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
                                    y: viewport.height - y,
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

        // Check if clicking on existing text
        const pageTextItems = textItems.filter((item) => item.page === currentPage);
        let clickedItem: TextItem | null = null;
        const tolerance = 20;

        for (const item of pageTextItems) {
            if (
                pdfX >= item.x - tolerance &&
                pdfX <= item.x + item.width + tolerance &&
                pdfY >= item.y - tolerance &&
                pdfY <= item.y + item.height + tolerance
            ) {
                clickedItem = item;
                break;
            }
        }

        // Check if there's an existing edit for this text
        if (clickedItem) {
            const existingEdit = edits.find(
                (e) =>
                    e.pageNumber === currentPage &&
                    e.originalText === clickedItem!.text &&
                    Math.abs(e.x - clickedItem!.x) < 5 &&
                    Math.abs(e.y - clickedItem!.y) < 5,
            );

            if (existingEdit) {
                setEditingId(existingEdit.id);
                setTimeout(() => {
                    const input = inputRefs.current.get(existingEdit.id);
                    if (input) {
                        input.focus();
                        input.select();
                    }
                }, 10);
                return;
            }

            // Create new edit for existing text
            const edit: TextEdit = {
                id: `edit-${Date.now()}`,
                pageNumber: currentPage,
                originalText: clickedItem.text,
                editedText: clickedItem.text,
                x: clickedItem.x,
                y: clickedItem.y,
                fontSize: clickedItem.fontSize || fontSize,
            };
            setEdits((prev) => [...prev, edit]);
            setEditingId(edit.id);
            setTimeout(() => {
                const input = inputRefs.current.get(edit.id);
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 10);
        } else {
            // Add new text at click position
            const edit: TextEdit = {
                id: `new-${Date.now()}`,
                pageNumber: currentPage,
                originalText: null,
                editedText: "",
                x: pdfX,
                y: pdfY,
                fontSize,
            };
            setEdits((prev) => [...prev, edit]);
            setEditingId(edit.id);
            setTimeout(() => {
                const input = inputRefs.current.get(edit.id);
                if (input) {
                    input.focus();
                }
            }, 10);
        }
    };

    const handleTextChange = (id: string, value: string) => {
        setEdits((prev) =>
            prev.map((edit) =>
                edit.id === id ? { ...edit, editedText: value } : edit,
            ),
        );
    };

    const handleTextBlur = (id: string) => {
        setEdits((prev) => {
            const edit = prev.find((e) => e.id === id);
            if (edit && !edit.editedText.trim()) {
                // Remove empty new text edits
                if (edit.originalText === null) {
                    return prev.filter((e) => e.id !== id);
                }
            }
            return prev;
        });
        setEditingId(null);
    };

    const handleTextKeyDown = (id: string, e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleTextBlur(id);
        } else if (e.key === "Escape") {
            const edit = edits.find((e) => e.id === id);
            if (edit && edit.originalText === null) {
                // Remove new text on escape
                setEdits((prev) => prev.filter((e) => e.id !== id));
            } else {
                // Restore original text
                if (edit) {
                    setEdits((prev) =>
                        prev.map((e) =>
                            e.id === id
                                ? { ...e, editedText: e.originalText || "" }
                                : e,
                        ),
                    );
                }
            }
            setEditingId(null);
        }
    };

    const removeEdit = (id: string) => {
        setEdits((prev) => prev.filter((e) => e.id !== id));
        if (editingId === id) {
            setEditingId(null);
        }
    };

    const handleApply = async () => {
        if (!file) {
            setError("Upload a PDF first.");
            return;
        }

        const validEdits = edits.filter((e) => e.editedText.trim());
        if (!validEdits.length) {
            setError("Make at least one text edit.");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const data = await applyTextEdits(file, validEdits);
            downloadBlob(data, "edited.pdf");
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to edit PDF.";
            setError(message);
        } finally {
            setIsProcessing(false);
        }
    };

    const getCurrentPageEdits = () => {
        return edits.filter((edit) => edit.pageNumber === currentPage);
    };

    const getCurrentPageTextItems = () => {
        return textItems.filter((item) => item.page === currentPage);
    };

    if (!file) {
        return (
            <ToolLayout
                title="Edit PDF"
                description="Click anywhere on the PDF to add or edit text directly in place. Edit existing text or add new text anywhere you want."
            >
                <div className="space-y-6">
                    <FileUpload
                        label="Select a PDF"
                        description="Choose a PDF file to edit."
                        multiple={false}
                        accept=".pdf"
                        onFilesSelected={(files) => {
                            setFile(files[0] ?? null);
                            setEdits([]);
                            setError(null);
                        }}
                    />
                </div>
            </ToolLayout>
        );
    }

    return (
        <ToolLayout
            title="Edit PDF"
            description="Click anywhere on the PDF to add or edit text directly in place. Edit existing text or add new text anywhere you want."
        >
            <div className="space-y-6">
                <FileUpload
                    label="Select a PDF"
                    description="Choose a PDF file to edit."
                    multiple={false}
                    accept=".pdf"
                    onFilesSelected={(files) => {
                        setFile(files[0] ?? null);
                        setEdits([]);
                        setError(null);
                    }}
                />

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
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-zinc-600 dark:text-zinc-400">
                                Font Size:
                            </label>
                            <input
                                type="number"
                                min="8"
                                max="72"
                                value={fontSize}
                                onChange={(e) =>
                                    setFontSize(Number.parseInt(e.target.value, 10) || 12)
                                }
                                className="w-16 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
                            />
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
                            className="cursor-text block"
                            style={{ maxWidth: "100%" }}
                        />
                        {/* Render editable text overlays */}
                        {getCurrentPageEdits().map((edit) => {
                            if (!canvasRef.current) return null;
                            const rect = canvasRef.current.getBoundingClientRect();
                            const scaleX = rect.width / canvasRef.current.width;
                            const scaleY = rect.height / canvasRef.current.height;
                            const x = edit.x * scaleX;
                            const y = edit.y * scaleY;
                            const isEditing = editingId === edit.id;

                            return (
                                <div
                                    key={edit.id}
                                    className="absolute"
                                    style={{
                                        left: `${x}px`,
                                        top: `${y}px`,
                                        transform: "translateY(-100%)",
                                    }}
                                >
                                    <input
                                        ref={(el) => {
                                            if (el) {
                                                inputRefs.current.set(edit.id, el);
                                            } else {
                                                inputRefs.current.delete(edit.id);
                                            }
                                        }}
                                        type="text"
                                        value={edit.editedText}
                                        onChange={(e) => handleTextChange(edit.id, e.target.value)}
                                        onBlur={() => handleTextBlur(edit.id)}
                                        onKeyDown={(e) => handleTextKeyDown(edit.id, e)}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`px-1 py-0.5 rounded text-xs font-medium border-2 transition-all ${isEditing
                                            ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-emerald-500 shadow-lg z-50"
                                            : edit.originalText === null
                                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100 border-emerald-300 dark:border-emerald-700"
                                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-700"
                                            }`}
                                        style={{
                                            fontSize: `${edit.fontSize * scaleX}px`,
                                            minWidth: "60px",
                                        }}
                                    />
                                    {!isEditing && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeEdit(edit.id);
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
                    Click anywhere on the PDF to add or edit text. Press Enter to save, Escape to cancel.
                </p>

                {edits.length > 0 && (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4">
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                            Text Edits ({edits.filter((e) => e.editedText.trim()).length})
                        </h2>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {edits
                                .filter((e) => e.editedText.trim())
                                .map((edit) => (
                                    <div
                                        key={edit.id}
                                        className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2"
                                    >
                                        <div className="flex-1">
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                Page {edit.pageNumber}
                                                {edit.originalText === null && " (New)"}
                                            </span>
                                            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 mt-1">
                                                {edit.originalText !== null && (
                                                    <>
                                                        <span className="line-through text-zinc-400 dark:text-zinc-500">
                                                            {edit.originalText}
                                                        </span>{" "}
                                                        →{" "}
                                                    </>
                                                )}
                                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                    {edit.editedText}
                                                </span>
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeEdit(edit.id)}
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
                    disabled={isProcessing || !file || !edits.filter((e) => e.editedText.trim()).length}
                    className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40"
                >
                    {isProcessing
                        ? "Generating edited PDF…"
                        : `Generate Edited PDF${edits.filter((e) => e.editedText.trim()).length > 0 ? ` (${edits.filter((e) => e.editedText.trim()).length} edit${edits.filter((e) => e.editedText.trim()).length > 1 ? "s" : ""})` : ""}`}
                </button>
            </div>
        </ToolLayout>
    );
}
