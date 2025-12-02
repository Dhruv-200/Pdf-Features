"use client";

import { useState } from "react";
import ToolLayout from "../../layouts/ToolLayout";
import FileUpload from "../../components/FileUpload";
import { mergePdfFiles, downloadBlob } from "../../utils/pdfHelpers";

type MergeItem = {
    id: string;
    file: File;
};

function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
}

export default function MergeToolPage() {
    const [items, setItems] = useState<MergeItem[]>([]);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [isMerging, setIsMerging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFilesSelected = (files: File[]) => {
        const next: MergeItem[] = files.map((file, index) => ({
            id: `${Date.now()}-${index}-${file.name}`,
            file,
        }));
        setItems((prev) => [...prev, ...next]);
    };

    const handleMerge = async () => {
        if (!items.length) {
            setError("Please add at least two PDF files to merge.");
            return;
        }
        if (items.length === 1) {
            setError("You need at least two PDFs to merge.");
            return;
        }
        setError(null);
        setIsMerging(true);
        try {
            const files = items.map((item) => item.file);
            const merged = await mergePdfFiles(files);
            downloadBlob(merged, "merged.pdf");
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to merge PDFs.";
            setError(message);
        } finally {
            setIsMerging(false);
        }
    };

    return (
        <ToolLayout
            title="Merge PDFs"
            description="Combine multiple PDF files into a single document. All processing happens locally in your browser; your files never leave your device."
        >
            <div className="space-y-6">
                <FileUpload
                    label="Select PDF files to merge"
                    description="Choose two or more PDF files. You can reorder them below before merging."
                    multiple
                    accept=".pdf"
                    onFilesSelected={handleFilesSelected}
                />

                {items.length > 0 && (
                    <div className="space-y-2">
                        <h2 className="text-sm font-medium text-zinc-200">
                            Files to merge (drag to reorder)
                        </h2>
                        <ul className="space-y-1 text-sm">
                            {items.map((item, index) => (
                                <li
                                    key={item.id}
                                    draggable
                                    onDragStart={() => setDragIndex(index)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => {
                                        if (dragIndex === null || dragIndex === index) return;
                                        setItems((prev) => reorder(prev, dragIndex, index));
                                        setDragIndex(null);
                                    }}
                                    className="flex items-center justify-between rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
                                >
                                    <span className="truncate text-zinc-100">
                                        {index + 1}. {item.file.name}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setItems((prev) =>
                                                prev.filter((existing) => existing.id !== item.id),
                                            )
                                        }
                                        className="text-xs text-zinc-400 hover:text-red-400"
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                    type="button"
                    onClick={handleMerge}
                    disabled={isMerging || items.length < 2}
                    className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-emerald-200"
                >
                    {isMerging ? "Merging…" : "Merge PDFs"}
                </button>

                {items.length > 4 && (
                    <p className="text-xs text-zinc-500">
                        Large or many PDFs may take a while to process in the browser.
                    </p>
                )}
            </div>
        </ToolLayout>
    );
}


