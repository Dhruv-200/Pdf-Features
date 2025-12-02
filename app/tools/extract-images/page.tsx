"use client";

import { useState, useEffect } from "react";
import ToolLayout from "../../layouts/ToolLayout";
import FileUpload from "../../components/FileUpload";

export default function ExtractImagesToolPage() {
    const [file, setFile] = useState<File | null>(null);
    const [images, setImages] = useState<Array<{ id: string; data: string; type: string; page: number }>>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);

    useEffect(() => {
        const extractImages = async () => {
            if (!file) {
                setImages([]);
                setPageCount(null);
                return;
            }

            setIsProcessing(true);
            setError(null);

            try {
                // @ts-expect-error - pdfjs-dist types are not fully compatible
                const pdfjsLib = await import("pdfjs-dist/build/pdf");
                if (typeof window !== "undefined") {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                }

                const data = new Uint8Array(await file.arrayBuffer());
                const loadingTask = pdfjsLib.getDocument({ data });
                const pdf = await loadingTask.promise;
                setPageCount(pdf.numPages);

                const extractedImages: Array<{ id: string; data: string; type: string; page: number }> = [];

                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
                    const page = await pdf.getPage(pageNum);
                    const ops = await page.getOperatorList();

                    for (let i = 0; i < ops.fnArray.length; i += 1) {
                        const op = ops.fnArray[i];
                        const opName = pdfjsLib.OPS[op];

                        if (opName === "paintImageXObject" || opName === "paintJpegXObject") {
                            const imgIdx = ops.argsArray[i][0];
                            const img = await page.objs.get(imgIdx);

                            if (img && img.data) {
                                let imageData: string;
                                let imageType: string;

                                if (img.data instanceof Uint8Array) {
                                    // Convert to base64
                                    const bytes = img.data as Uint8Array;
                                    const binary = Array.from(bytes, (byte) =>
                                        String.fromCharCode(byte),
                                    ).join("");
                                    const base64 = btoa(binary);

                                    // Determine image type
                                    if (opName === "paintJpegXObject" || bytes[0] === 0xff && bytes[1] === 0xd8) {
                                        imageType = "jpg";
                                        imageData = `data:image/jpeg;base64,${base64}`;
                                    } else if (bytes[0] === 0x89 && bytes[1] === 0x50) {
                                        imageType = "png";
                                        imageData = `data:image/png;base64,${base64}`;
                                    } else {
                                        imageType = "png";
                                        imageData = `data:image/png;base64,${base64}`;
                                    }

                                    extractedImages.push({
                                        id: `img-${pageNum}-${i}`,
                                        data: imageData,
                                        type: imageType,
                                        page: pageNum,
                                    });
                                }
                            }
                        }
                    }
                }

                setImages(extractedImages);
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to extract images.";
                setError(message);
            } finally {
                setIsProcessing(false);
            }
        };

        void extractImages();
    }, [file]);

    const downloadImage = (image: { id: string; data: string; type: string; page: number }) => {
        const link = document.createElement("a");
        link.href = image.data;
        link.download = `image-page-${image.page}-${image.id}.${image.type}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadAllImages = () => {
        images.forEach((image, index) => {
            setTimeout(() => {
                downloadImage(image);
            }, index * 100);
        });
    };

    return (
        <ToolLayout
            title="Extract Images"
            description="Extract all images from a PDF document. Download individual images or all images at once."
        >
            <div className="space-y-6">
                <FileUpload
                    label="Select a PDF"
                    description="Choose a PDF file to extract images from."
                    multiple={false}
                    accept=".pdf"
                    onFilesSelected={(files) => {
                        setFile(files[0] ?? null);
                        setError(null);
                    }}
                />

                {isProcessing && (
                    <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-2"></div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Extracting images from PDF...
                        </p>
                    </div>
                )}

                {pageCount !== null && !isProcessing && (
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Found <span className="font-semibold text-zinc-900 dark:text-zinc-100">{images.length}</span> image{images.length !== 1 ? "s" : ""} in{" "}
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{pageCount}</span> page{pageCount !== 1 ? "s" : ""}
                        </p>
                    </div>
                )}

                {images.length > 0 && (
                    <>
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                Extracted Images ({images.length})
                            </h3>
                            <button
                                type="button"
                                onClick={downloadAllImages}
                                className="px-4 py-2 rounded-md bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
                            >
                                Download All
                            </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {images.map((image) => (
                                <div
                                    key={image.id}
                                    className="relative group rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden"
                                >
                                    <img
                                        src={image.data}
                                        alt={`Image from page ${image.page}`}
                                        className="w-full h-32 object-contain bg-zinc-50 dark:bg-zinc-900"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                        <button
                                            onClick={() => downloadImage(image)}
                                            className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-md bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-all"
                                        >
                                            Download
                                        </button>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1">
                                        Page {image.page} · {image.type.toUpperCase()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {images.length === 0 && !isProcessing && file && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
                        <p className="text-sm text-amber-800 dark:text-amber-300">
                            No images found in this PDF. The PDF may contain only text or scanned content.
                        </p>
                    </div>
                )}

                {error && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-3">
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}
            </div>
        </ToolLayout>
    );
}

