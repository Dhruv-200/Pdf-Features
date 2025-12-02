"use client";

import { useState, useEffect } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import ToolLayout from "../../layouts/ToolLayout";
import FileUpload from "../../components/FileUpload";
import { downloadBlob, readFileAsArrayBuffer } from "../../utils/pdfHelpers";

async function rotateAllPages(file: File, rotation: 90 | 180 | 270): Promise<Uint8Array> {
    const buffer = await readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(buffer);
    const pageCount = pdfDoc.getPageCount();

    for (let i = 0; i < pageCount; i += 1) {
        const page = pdfDoc.getPage(i);
        const currentRotation = page.getRotation().angle;
        const newRotation = (currentRotation + rotation) % 360;
        page.setRotation(degrees(newRotation));
    }

    return pdfDoc.save();
}

export default function RotatePagesToolPage() {
    const [file, setFile] = useState<File | null>(null);
    const [rotation, setRotation] = useState<90 | 180 | 270>(90);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);

    useEffect(() => {
        const loadPdf = async () => {
            if (!file) {
                setPageCount(null);
                return;
            }
            try {
                const buffer = await readFileAsArrayBuffer(file);
                const pdfDoc = await PDFDocument.load(buffer);
                setPageCount(pdfDoc.getPageCount());
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to read PDF.";
                setError(message);
            }
        };
        void loadPdf();
    }, [file]);

    const handleRotate = async () => {
        if (!file) {
            setError("Please upload a PDF first.");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const rotatedData = await rotateAllPages(file, rotation);
            downloadBlob(rotatedData, "rotated.pdf");
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to rotate pages.";
            setError(message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <ToolLayout
            title="Rotate All Pages"
            description="Rotate all pages in your PDF by 90, 180, or 270 degrees. Useful for fixing orientation issues."
        >
            <div className="space-y-6">
                <FileUpload
                    label="Select a PDF"
                    description="Choose a PDF file to rotate all pages."
                    multiple={false}
                    accept=".pdf"
                    onFilesSelected={(files) => {
                        setFile(files[0] ?? null);
                        setError(null);
                    }}
                />

                {pageCount !== null && (
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            This PDF has <span className="font-semibold text-zinc-900 dark:text-zinc-100">{pageCount}</span> page{pageCount !== 1 ? "s" : ""}. All pages will be rotated.
                        </p>
                    </div>
                )}

                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Rotation Settings
                    </h3>

                    <div className="space-y-3">
                        <label className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                            <input
                                type="radio"
                                name="rotation"
                                value="90"
                                checked={rotation === 90}
                                onChange={() => setRotation(90)}
                                className="text-emerald-500 focus:ring-emerald-500"
                            />
                            <div className="flex-1">
                                <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                                    90° Clockwise
                                </div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Rotate pages 90 degrees clockwise
                                </div>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                            <input
                                type="radio"
                                name="rotation"
                                value="180"
                                checked={rotation === 180}
                                onChange={() => setRotation(180)}
                                className="text-emerald-500 focus:ring-emerald-500"
                            />
                            <div className="flex-1">
                                <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                                    180° (Upside Down)
                                </div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Rotate pages 180 degrees (flip upside down)
                                </div>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                            <input
                                type="radio"
                                name="rotation"
                                value="270"
                                checked={rotation === 270}
                                onChange={() => setRotation(270)}
                                className="text-emerald-500 focus:ring-emerald-500"
                            />
                            <div className="flex-1">
                                <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                                    270° Clockwise (90° Counter-clockwise)
                                </div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Rotate pages 270 degrees clockwise
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                {error && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-3">
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleRotate}
                    disabled={isProcessing || !file}
                    className="w-full inline-flex items-center justify-center rounded-md bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-emerald-200 transition-colors shadow-lg shadow-emerald-500/20"
                >
                    {isProcessing ? "Rotating pages…" : "Rotate All Pages"}
                </button>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                    Note: This rotates all pages in the PDF. If you need to rotate individual pages, use the Page Manager tool instead.
                </p>
            </div>
        </ToolLayout>
    );
}

