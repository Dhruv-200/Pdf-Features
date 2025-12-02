"use client";

import { useEffect, useState } from "react";
import ToolLayout from "../../layouts/ToolLayout";
import FileUpload from "../../components/FileUpload";
import {
    downloadBlob,
    extractPagesFromPdf,
    loadPdfDocument,
} from "../../utils/pdfHelpers";

function parseRanges(input: string, maxPage: number): number[][] {
    const trimmed = input.trim();
    if (!trimmed) return [];

    const parts = trimmed.split(",");
    const ranges: number[][] = [];

    for (const part of parts) {
        const text = part.trim();
        if (!text) continue;

        if (text.includes("-")) {
            const [startStr, endStr] = text.split("-");
            let start = Number.parseInt(startStr, 10);
            let end = Number.parseInt(endStr, 10);
            if (Number.isNaN(start) || Number.isNaN(end)) {
                throw new Error(`Invalid range: "${text}"`);
            }
            if (start < 1 || end < 1 || start > maxPage) {
                throw new Error(`Range out of bounds: "${text}"`);
            }
            if (end > maxPage) end = maxPage;
            if (end < start) {
                [start, end] = [end, start];
            }
            ranges.push([start, end]);
        } else {
            const page = Number.parseInt(text, 10);
            if (Number.isNaN(page) || page < 1 || page > maxPage) {
                throw new Error(`Invalid page: "${text}"`);
            }
            ranges.push([page, page]);
        }
    }

    return ranges;
}

export default function ExtractPagesToolPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [rangeInput, setRangeInput] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!file) {
                setPageCount(null);
                return;
            }
            try {
                const doc = await loadPdfDocument(file);
                setPageCount(doc.getPageCount());
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to read PDF.";
                setError(message);
            }
        };
        void load();
    }, [file]);

    const handleExtract = async () => {
        if (!file || !pageCount) {
            setError("Please upload a PDF first.");
            return;
        }
        if (!rangeInput.trim()) {
            setError("Enter page numbers or ranges to extract, e.g. 1-3,5,8.");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const ranges = parseRanges(rangeInput, pageCount);
            if (!ranges.length) {
                setError("No valid ranges found.");
                setIsProcessing(false);
                return;
            }
            const data = await extractPagesFromPdf(file, ranges);
            downloadBlob(data, "extracted-pages.pdf");
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to extract pages.";
            setError(message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <ToolLayout
            title="Extract pages"
            description="Create a new PDF that contains only the pages you select from an existing document. Everything runs in your browser."
        >
            <div className="space-y-6">
                <FileUpload
                    label="Select a PDF"
                    description="Choose a single PDF, then specify which pages to keep."
                    multiple={false}
                    accept=".pdf"
                    onFilesSelected={(files) => {
                        setFile(files[0] ?? null);
                        setError(null);
                    }}
                />

                {pageCount !== null && (
                    <p className="text-xs text-zinc-400">
                        This document has <span className="font-semibold">{pageCount}</span>{" "}
                        pages.
                    </p>
                )}

                <div className="space-y-2 text-sm">
                    <label className="block text-xs font-medium text-zinc-200">
                        Pages to extract
                    </label>
                    <input
                        type="text"
                        value={rangeInput}
                        onChange={(e) => setRangeInput(e.target.value)}
                        placeholder="e.g. 1-3,5,8"
                        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
                    />
                    <p className="text-xs text-zinc-500">
                        Use commas to separate ranges and single pages. Example:{" "}
                        <span className="font-mono">1-3,5,8</span>.
                    </p>
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                    type="button"
                    onClick={handleExtract}
                    disabled={isProcessing || !file}
                    className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-emerald-200"
                >
                    {isProcessing ? "Extracting…" : "Extract pages"}
                </button>

                {file && pageCount && pageCount > 200 && (
                    <p className="text-[11px] text-zinc-500">
                        Extracting pages from very large PDFs can be slow and memory
                        intensive in the browser.
                    </p>
                )}
            </div>
        </ToolLayout>
    );
}


