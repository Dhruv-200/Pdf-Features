"use client";

import { useEffect, useState } from "react";
import ToolLayout from "../../layouts/ToolLayout";
import FileUpload from "../../components/FileUpload";
import {
    downloadBlob,
    loadPdfDocument,
    splitPdfByRanges,
} from "../../utils/pdfHelpers";

type OutputFile = {
    label: string;
    data: Uint8Array;
};

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

export default function SplitToolPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [rangeInput, setRangeInput] = useState<string>("");
    const [presetN, setPresetN] = useState<string>("");
    const [outputs, setOutputs] = useState<OutputFile[]>([]);
    const [isSplitting, setIsSplitting] = useState(false);
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

    const handlePreset = () => {
        if (!pageCount || !presetN) return;
        const n = Number.parseInt(presetN, 10);
        if (!n || n < 1) {
            setError("Please enter a valid number of pages for the preset.");
            return;
        }
        const ranges: string[] = [];
        for (let start = 1; start <= pageCount; start += n) {
            const end = Math.min(start + n - 1, pageCount);
            ranges.push(start === end ? `${start}` : `${start}-${end}`);
        }
        setRangeInput(ranges.join(","));
        setError(null);
    };

    const handleSplit = async () => {
        if (!file || !pageCount) {
            setError("Please upload a PDF first.");
            return;
        }
        if (!rangeInput.trim()) {
            setError("Enter page ranges, e.g. 1-3,5,8-10.");
            return;
        }

        setIsSplitting(true);
        setError(null);
        setOutputs([]);

        try {
            const ranges = parseRanges(rangeInput, pageCount);
            if (!ranges.length) {
                setError("No valid ranges found.");
                setIsSplitting(false);
                return;
            }
            const result = await splitPdfByRanges(file, ranges);
            setOutputs(result);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to split PDF.";
            setError(message);
        } finally {
            setIsSplitting(false);
        }
    };

    return (
        <ToolLayout
            title="Split PDF"
            description="Split a PDF into multiple parts by page ranges. All processing happens in your browser; your files never leave your device."
        >
            <div className="space-y-6">
                <FileUpload
                    label="Select a PDF to split"
                    description="Choose a single PDF. You can then specify page ranges to extract."
                    multiple={false}
                    accept=".pdf"
                    onFilesSelected={(files) => {
                        setFile(files[0] ?? null);
                        setOutputs([]);
                        setRangeInput("");
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
                        Page ranges
                    </label>
                    <input
                        type="text"
                        value={rangeInput}
                        onChange={(e) => setRangeInput(e.target.value)}
                        placeholder="e.g. 1-3,5,8-10"
                        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
                    />
                    <p className="text-xs text-zinc-500">
                        Use commas to separate ranges and single pages. Example:{" "}
                        <span className="font-mono">1-3,5,8-10</span>.
                    </p>
                </div>

                {pageCount && (
                    <div className="space-y-2 text-sm">
                        <label className="block text-xs font-medium text-zinc-200">
                            Or split every N pages
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                min={1}
                                value={presetN}
                                onChange={(e) => setPresetN(e.target.value)}
                                className="w-24 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-400 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={handlePreset}
                                className="inline-flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-100 hover:border-emerald-400 hover:bg-zinc-800"
                            >
                                Fill ranges
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500">
                            Example: enter <span className="font-mono">3</span> to split into
                            parts of 3 pages each.
                        </p>
                    </div>
                )}

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                    type="button"
                    onClick={handleSplit}
                    disabled={isSplitting || !file}
                    className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-emerald-200"
                >
                    {isSplitting ? "Splitting…" : "Split PDF"}
                </button>

                {outputs.length > 0 && (
                    <div className="space-y-2">
                        <h2 className="text-sm font-medium text-zinc-200">
                            Split parts ({outputs.length})
                        </h2>
                        <ul className="space-y-1 text-xs">
                            {outputs.map((out, index) => (
                                <li
                                    key={out.label}
                                    className="flex items-center justify-between rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
                                >
                                    <span className="truncate text-zinc-100">
                                        Part {index + 1}: {out.label}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => downloadBlob(out.data, out.label)}
                                        className="ml-2 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                                    >
                                        Download
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <p className="text-[11px] text-zinc-500">
                            Note: Each part is downloaded individually to keep everything
                            simple and fully client-side.
                        </p>
                    </div>
                )}

                {file && pageCount && pageCount > 200 && (
                    <p className="text-[11px] text-zinc-500">
                        Very large PDFs may take a while to process and can be memory
                        intensive in the browser.
                    </p>
                )}
            </div>
        </ToolLayout>
    );
}


