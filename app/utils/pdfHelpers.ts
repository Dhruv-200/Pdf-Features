import { PDFDocument, degrees } from "pdf-lib";

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
                resolve(reader.result);
            } else {
                reject(new Error("Failed to read file as ArrayBuffer"));
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

export async function loadPdfDocument(file: File): Promise<PDFDocument> {
    const buffer = await readFileAsArrayBuffer(file);
    return PDFDocument.load(buffer);
}

export async function mergePdfFiles(files: File[]): Promise<Uint8Array> {
    if (!files.length) {
        throw new Error("No files to merge");
    }

    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
        const srcBuffer = await readFileAsArrayBuffer(file);
        const srcPdf = await PDFDocument.load(srcBuffer);
        const copiedPages = await mergedPdf.copyPages(
            srcPdf,
            srcPdf.getPageIndices(),
        );
        copiedPages.forEach((page: any) => mergedPdf.addPage(page));
    }

    const result = await mergedPdf.save();
    return result;
}

export async function splitPdfByRanges(
    file: File,
    ranges: number[][],
): Promise<{ label: string; data: Uint8Array }[]> {
    const srcBuffer = await readFileAsArrayBuffer(file);
    const srcPdf = await PDFDocument.load(srcBuffer);
    const outputs: { label: string; data: Uint8Array }[] = [];

    let part = 1;
    for (const [start, end] of ranges) {
        const doc = await PDFDocument.create();
        const indices: number[] = [];
        for (let i = start; i <= end; i += 1) {
            indices.push(i - 1);
        }
        const copied = await doc.copyPages(srcPdf, indices);
        copied.forEach((page: any) => doc.addPage(page));
        const data = await doc.save();
        outputs.push({
            label: `split-part-${part}.pdf`,
            data,
        });
        part += 1;
    }

    return outputs;
}

export async function extractPagesFromPdf(
    file: File,
    ranges: number[][],
): Promise<Uint8Array> {
    const srcBuffer = await readFileAsArrayBuffer(file);
    const srcPdf = await PDFDocument.load(srcBuffer);
    const outPdf = await PDFDocument.create();

    for (const [start, end] of ranges) {
        for (let pageNum = start; pageNum <= end; pageNum += 1) {
            const [copied] = await outPdf.copyPages(srcPdf, [pageNum - 1]);
            outPdf.addPage(copied);
        }
    }

    return outPdf.save();
}

export type PageTransform = {
    pageIndex: number;
    rotation: 0 | 90 | 180 | 270;
};

export async function applyPageTransforms(
    file: File,
    order: PageTransform[],
): Promise<Uint8Array> {
    const srcBuffer = await readFileAsArrayBuffer(file);
    const srcPdf = await PDFDocument.load(srcBuffer);
    const outPdf = await PDFDocument.create();

    for (const item of order) {
        const [copied] = await outPdf.copyPages(srcPdf, [item.pageIndex]);
        if (item.rotation !== 0) {
            copied.setRotation(degrees(item.rotation));
        }
        outPdf.addPage(copied);
    }

    return outPdf.save();
}

export function downloadBlob(data: Uint8Array, filename: string) {
    const blob = new Blob([data as unknown as BlobPart], {
        type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}


