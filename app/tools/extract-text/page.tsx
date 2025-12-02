"use client";

import { useState } from "react";
import ToolLayout from "../../layouts/ToolLayout";
import FileUpload from "../../components/FileUpload";

type ExtractState = {
    text: string;
    error: string | null;
    isProcessing: boolean;
};

async function extractTextFromPdf(file: File): Promise<string> {
    // @ts-expect-error - pdfjs-dist types are not fully compatible
    const pdfjsLib = await import("pdfjs-dist/build/pdf");

    // Configure the worker for pdf.js - use unpkg CDN which is more reliable
    if (typeof window !== "undefined") {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;

    const parts: string[] = [];
    const pageCount = pdf.numPages;

    for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();

        // Improved text extraction with better positioning and formatting
        const textItems: Array<{ text: string; y: number; x: number }> = [];

        for (const item of content.items) {
            if ("str" in item && item.str && item.str.trim()) {
                const transform = (item as any).transform as number[];
                if (transform && transform.length >= 6) {
                    const x = transform[4] || 0;
                    const y = transform[5] || 0;
                    // Convert to top-left origin for easier sorting
                    const pdfY = viewport.height - y;
                    textItems.push({
                        text: item.str,
                        x,
                        y: pdfY,
                    });
                }
            }
        }

        // Sort by Y position (top to bottom), then by X position (left to right)
        textItems.sort((a, b) => {
            const yDiff = Math.abs(a.y - b.y);
            // If items are on the same line (within 5px), sort by X
            if (yDiff < 5) {
                return a.x - b.x;
            }
            return b.y - a.y; // Higher Y first (top to bottom)
        });

        // Build text with proper line breaks and spacing
        let pageText = `--- Page ${pageNum} ---\n`;
        let lastY = -1;
        let lineText = "";

        for (const item of textItems) {
            const isNewLine = lastY === -1 || Math.abs(item.y - lastY) > 5;

            if (isNewLine && lineText) {
                pageText += lineText.trim() + "\n";
                lineText = "";
            }

            // Add space if items are far apart horizontally (likely separate words)
            if (lineText && item.x - (textItems.find(t => Math.abs(t.y - item.y) < 5 && t.x < item.x)?.x || item.x) > 10) {
                lineText += " ";
            }

            lineText += item.text;
            lastY = item.y;
        }

        if (lineText) {
            pageText += lineText.trim() + "\n";
        }

        parts.push(pageText + "\n");
    }

    return parts.join("\n");
}

export default function ExtractTextToolPage() {
    const [file, setFile] = useState<File | null>(null);
    const [{ text, error, isProcessing }, setState] = useState<ExtractState>({
        text: "",
        error: null,
        isProcessing: false,
    });

    const handleExtract = async () => {
        if (!file) {
            setState((prev) => ({
                ...prev,
                error: "Please upload a PDF first.",
            }));
            return;
        }

        setState({ text: "", error: null, isProcessing: true });

        try {
            const content = await extractTextFromPdf(file);
            setState({ text: content, error: null, isProcessing: false });
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Failed to extract text from PDF.";
            setState({ text: "", error: message, isProcessing: false });
        }
    };

    const handleDownloadTxt = () => {
        if (!text) return;
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "extracted-text.txt";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <ToolLayout
            title="Extract text"
            description="Extract selectable text from a PDF (non-scanned) directly in your browser. Scanned/image-only PDFs may not return meaningful text."
        >
            <div className="space-y-6">
                <FileUpload
                    label="Select a PDF"
                    description="Choose a PDF that contains selectable text (not just scanned images)."
                    multiple={false}
                    accept=".pdf"
                    onFilesSelected={(files) => {
                        setFile(files[0] ?? null);
                        setState({ text: "", error: null, isProcessing: false });
                    }}
                />

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                    type="button"
                    onClick={handleExtract}
                    disabled={isProcessing || !file}
                    className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-emerald-200"
                >
                    {isProcessing ? "Extracting text…" : "Extract text"}
                </button>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-200">
                            Extracted text
                        </span>
                        <button
                            type="button"
                            onClick={handleDownloadTxt}
                            disabled={!text}
                            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 disabled:cursor-not-allowed disabled:text-zinc-600"
                        >
                            Download as .txt
                        </button>
                    </div>
                    <textarea
                        value={text}
                        readOnly
                        rows={14}
                        className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-50 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
                        placeholder={
                            isProcessing
                                ? "Extracting text from PDF…"
                                : "Extracted text will appear here."
                        }
                    />
                    <p className="text-[11px] text-zinc-500">
                        Note: This works best for digital PDFs with embedded text. Scanned
                        documents that are pure images generally require OCR, which is not
                        performed here.
                    </p>
                </div>
            </div>
        </ToolLayout>
    );
}


