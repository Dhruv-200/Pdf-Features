"use client";

import { useEffect, useState } from "react";
import { PDFDocument, StandardFonts } from "pdf-lib";
import ToolLayout from "../../layouts/ToolLayout";
import FileUpload from "../../components/FileUpload";
import { downloadBlob, readFileAsArrayBuffer } from "../../utils/pdfHelpers";

type HorizontalAlign = "left" | "center" | "right";
type VerticalPosition = "header" | "footer";

type Format = "page-x" | "x-of-n" | "x";

async function addPageNumbers(options: {
    file: File;
    position: VerticalPosition;
    align: HorizontalAlign;
    startNumber: number;
    format: Format;
}): Promise<Uint8Array> {
    const buffer = await readFileAsArrayBuffer(options.file);
    const pdfDoc = await PDFDocument.load(buffer);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pageCount = pdfDoc.getPageCount();

    for (let index = 0; index < pageCount; index += 1) {
        const page = pdfDoc.getPage(index);
        const { width, height } = page.getSize();

        const logicalNumber = options.startNumber + index;
        let label: string;
        switch (options.format) {
            case "page-x":
                label = `Page ${logicalNumber}`;
                break;
            case "x-of-n":
                label = `${logicalNumber} / ${pageCount}`;
                break;
            case "x":
            default:
                label = `${logicalNumber}`;
        }

        const fontSize = 10;
        const marginX = 32;
        const marginY = 24;
        const textWidth = font.widthOfTextAtSize(label, fontSize);

        let x = marginX;
        if (options.align === "center") {
            x = (width - textWidth) / 2;
        } else if (options.align === "right") {
            x = width - textWidth - marginX;
        }

        const y =
            options.position === "header"
                ? height - marginY
                : marginY;

        page.drawText(label, {
            x,
            y,
            size: fontSize,
            font,
        });
    }

    return pdfDoc.save();
}

export default function PageNumbersToolPage() {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [position, setPosition] = useState<VerticalPosition>("footer");
    const [align, setAlign] = useState<HorizontalAlign>("center");
    const [startNumber, setStartNumber] = useState<number>(1);
    const [format, setFormat] = useState<Format>("page-x");
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
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
        void load();
    }, [file]);

    const handleApply = async () => {
        if (!file) {
            setError("Please upload a PDF first.");
            return;
        }
        setIsProcessing(true);
        setError(null);
        try {
            const data = await addPageNumbers({
                file,
                position,
                align,
                startNumber,
                format,
            });
            downloadBlob(data, "page-numbers.pdf");
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to add page numbers.";
            setError(message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <ToolLayout
            title="Add page numbers"
            description="Insert page numbers into your PDF at the header or footer, with customizable format and starting number. Everything runs in your browser."
        >
            <div className="space-y-6">
                <FileUpload
                    label="Select a PDF"
                    description="Choose a single PDF to number."
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

                <div className="flex flex-wrap gap-4 text-sm">
                    <div className="space-y-1">
                        <span className="block text-xs font-medium text-zinc-200">
                            Vertical position
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setPosition("header")}
                                className={`rounded-md px-3 py-1 text-xs ${position === "header"
                                        ? "bg-emerald-500 text-emerald-950"
                                        : "bg-zinc-900 text-zinc-200"
                                    }`}
                            >
                                Header
                            </button>
                            <button
                                type="button"
                                onClick={() => setPosition("footer")}
                                className={`rounded-md px-3 py-1 text-xs ${position === "footer"
                                        ? "bg-emerald-500 text-emerald-950"
                                        : "bg-zinc-900 text-zinc-200"
                                    }`}
                            >
                                Footer
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="block text-xs font-medium text-zinc-200">
                            Horizontal alignment
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setAlign("left")}
                                className={`rounded-md px-3 py-1 text-xs ${align === "left"
                                        ? "bg-emerald-500 text-emerald-950"
                                        : "bg-zinc-900 text-zinc-200"
                                    }`}
                            >
                                Left
                            </button>
                            <button
                                type="button"
                                onClick={() => setAlign("center")}
                                className={`rounded-md px-3 py-1 text-xs ${align === "center"
                                        ? "bg-emerald-500 text-emerald-950"
                                        : "bg-zinc-900 text-zinc-200"
                                    }`}
                            >
                                Center
                            </button>
                            <button
                                type="button"
                                onClick={() => setAlign("right")}
                                className={`rounded-md px-3 py-1 text-xs ${align === "right"
                                        ? "bg-emerald-500 text-emerald-950"
                                        : "bg-zinc-900 text-zinc-200"
                                    }`}
                            >
                                Right
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="block text-xs font-medium text-zinc-200">
                            Start number
                        </span>
                        <input
                            type="number"
                            min={1}
                            value={startNumber}
                            onChange={(e) =>
                                setStartNumber(
                                    Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                                )
                            }
                            className="w-24 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-400 focus:outline-none"
                        />
                        <p className="text-[11px] text-zinc-500">
                            Logical page 1 will be printed as this number (useful if your PDF
                            starts after a cover).
                        </p>
                    </div>
                </div>

                <div className="space-y-1 text-sm">
                    <span className="block text-xs font-medium text-zinc-200">
                        Format
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setFormat("page-x")}
                            className={`rounded-md px-3 py-1 text-xs ${format === "page-x"
                                    ? "bg-emerald-500 text-emerald-950"
                                    : "bg-zinc-900 text-zinc-200"
                                }`}
                        >
                            Page X
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormat("x-of-n")}
                            className={`rounded-md px-3 py-1 text-xs ${format === "x-of-n"
                                    ? "bg-emerald-500 text-emerald-950"
                                    : "bg-zinc-900 text-zinc-200"
                                }`}
                        >
                            X / N
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormat("x")}
                            className={`rounded-md px-3 py-1 text-xs ${format === "x"
                                    ? "bg-emerald-500 text-emerald-950"
                                    : "bg-zinc-900 text-zinc-200"
                                }`}
                        >
                            X
                        </button>
                    </div>
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                    type="button"
                    onClick={handleApply}
                    disabled={isProcessing || !file}
                    className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-emerald-200"
                >
                    {isProcessing ? "Adding page numbers…" : "Add page numbers"}
                </button>
            </div>
        </ToolLayout>
    );
}


