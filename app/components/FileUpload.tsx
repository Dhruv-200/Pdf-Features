/* eslint-disable jsx-a11y/label-has-associated-control */
"use client";

import { useRef, useState } from "react";

type FileUploadProps = {
    label: string;
    description?: string;
    multiple?: boolean;
    accept?: string;
    onFilesSelected: (files: File[]) => void;
};

export default function FileUpload({
    label,
    description,
    multiple,
    accept = ".pdf",
    onFilesSelected,
}: FileUploadProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) {
            setSelectedFiles([]);
            return;
        }

        const fileArray = Array.from(files);

        if (accept.includes("pdf")) {
            const invalid = fileArray.find(
                (file) => !file.name.toLowerCase().endsWith(".pdf"),
            );
            if (invalid) {
                setError("Please select PDF files only.");
                event.target.value = "";
                setSelectedFiles([]);
                return;
            }
        }

        setError(null);
        setSelectedFiles(fileArray);
        onFilesSelected(fileArray);
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {label}
            </label>
            {description && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{description}</p>
            )}
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-2 w-full inline-flex items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950 px-6 py-8 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all duration-200 hover:shadow-lg"
            >
                <svg className="w-5 h-5 mr-2 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Click to choose file(s)</span>
            </button>
            <input
                ref={inputRef}
                type="file"
                multiple={multiple}
                accept={accept}
                onChange={handleChange}
                className="hidden"
            />
            {selectedFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                    {selectedFiles.map((file, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/50 dark:border-emerald-500/30 px-4 py-2.5 shadow-sm"
                        >
                            <svg
                                className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                Uploaded: {file.name}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}


