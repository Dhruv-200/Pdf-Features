"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "../../layouts/ToolLayout";
import FileUpload from "../../components/FileUpload";
import { downloadBlob } from "../../utils/pdfHelpers";

type ImageItem = {
    id: string;
    file: File;
};

type Orientation = "portrait" | "landscape";
type PageSize = "a4" | "letter";

const PAGE_SIZES: Record<PageSize, { width: number; height: number }> = {
    a4: { width: 595.28, height: 841.89 },
    letter: { width: 612, height: 792 },
};

function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
}

async function createPdfFromImages(
    items: ImageItem[],
    pageSize: PageSize,
    orientation: Orientation,
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const baseSize = PAGE_SIZES[pageSize];
    const width =
        orientation === "portrait" ? baseSize.width : baseSize.height;
    const height =
        orientation === "portrait" ? baseSize.height : baseSize.width;

    for (const item of items) {
        const file = item.file;
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const isPng = file.type === "image/png";
        const embedded = isPng
            ? await pdfDoc.embedPng(bytes)
            : await pdfDoc.embedJpg(bytes);

        const imgWidth = embedded.width;
        const imgHeight = embedded.height;

        const scale = Math.min(width / imgWidth, height / imgHeight);
        const drawWidth = imgWidth * scale;
        const drawHeight = imgHeight * scale;

        const page = pdfDoc.addPage([width, height]);
        const x = (width - drawWidth) / 2;
        const y = (height - drawHeight) / 2;

        page.drawImage(embedded, {
            x,
            y,
            width: drawWidth,
            height: drawHeight,
        });
    }

    return pdfDoc.save();
}

export default function ImagesToPdfPage() {
    const [images, setImages] = useState<ImageItem[]>([]);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [orientation, setOrientation] = useState<Orientation>("portrait");
    const [pageSize, setPageSize] = useState<PageSize>("a4");
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFilesSelected = (files: File[]) => {
        const valid = files.filter((file) =>
            ["image/jpeg", "image/png"].includes(file.type),
        );
        if (!valid.length) {
            setError("Please select JPG or PNG images.");
            return;
        }
        const items: ImageItem[] = valid.map((file, index) => ({
            id: `${Date.now()}-${index}-${file.name}`,
            file,
        }));
        setImages((prev) => [...prev, ...items]);
        setError(null);
    };

    const handleGenerate = async () => {
        if (!images.length) {
            setError("Please add at least one image.");
            return;
        }
        setIsProcessing(true);
        setError(null);

        try {
            const data = await createPdfFromImages(images, pageSize, orientation);
            downloadBlob(data, "images-to-pdf.pdf");
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Failed to generate PDF from images.";
            setError(message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <ToolLayout
            title="Images to PDF"
            description="Convert one or more images (JPG/PNG) into a PDF where each image is placed on its own page. All processing happens locally in your browser."
        >
            <div className="space-y-6">
                <FileUpload
                    label="Select images"
                    description="You can add multiple JPG or PNG images and reorder them before generating the PDF."
                    multiple
                    accept="image/jpeg,image/png"
                    onFilesSelected={handleFilesSelected}
                />

                {images.length > 0 && (
                    <div className="space-y-2">
                        <h2 className="text-sm font-medium text-zinc-200">
                            Images (drag to reorder)
                        </h2>
                        <ul className="space-y-1 text-xs">
                            {images.map((item, index) => (
                                <li
                                    key={item.id}
                                    draggable
                                    onDragStart={() => setDragIndex(index)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => {
                                        if (dragIndex === null || dragIndex === index) return;
                                        setImages((prev) => reorder(prev, dragIndex, index));
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
                                            setImages((prev) =>
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
                        <p className="text-[11px] text-zinc-500">
                            The final PDF will contain one page per image in the order shown
                            above.
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap gap-4 text-sm">
                    <div className="space-y-1">
                        <span className="block text-xs font-medium text-zinc-200">
                            Orientation
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setOrientation("portrait")}
                                className={`rounded-md px-3 py-1 text-xs ${orientation === "portrait"
                                        ? "bg-emerald-500 text-emerald-950"
                                        : "bg-zinc-900 text-zinc-200"
                                    }`}
                            >
                                Portrait
                            </button>
                            <button
                                type="button"
                                onClick={() => setOrientation("landscape")}
                                className={`rounded-md px-3 py-1 text-xs ${orientation === "landscape"
                                        ? "bg-emerald-500 text-emerald-950"
                                        : "bg-zinc-900 text-zinc-200"
                                    }`}
                            >
                                Landscape
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="block text-xs font-medium text-zinc-200">
                            Page size
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setPageSize("a4")}
                                className={`rounded-md px-3 py-1 text-xs ${pageSize === "a4"
                                        ? "bg-emerald-500 text-emerald-950"
                                        : "bg-zinc-900 text-zinc-200"
                                    }`}
                            >
                                A4
                            </button>
                            <button
                                type="button"
                                onClick={() => setPageSize("letter")}
                                className={`rounded-md px-3 py-1 text-xs ${pageSize === "letter"
                                        ? "bg-emerald-500 text-emerald-950"
                                        : "bg-zinc-900 text-zinc-200"
                                    }`}
                            >
                                Letter
                            </button>
                        </div>
                    </div>
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isProcessing || !images.length}
                    className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-emerald-200"
                >
                    {isProcessing ? "Generating PDF…" : "Generate PDF"}
                </button>

                {images.length > 20 && (
                    <p className="text-[11px] text-zinc-500">
                        Many large images can be slow to process in the browser and may use
                        significant memory.
                    </p>
                )}
            </div>
        </ToolLayout>
    );
}


