"use client";

export default function ToolLayout({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-50">
            <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-900/80 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <a
                        href="/"
                        className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                    >
                        PDF Studio
                    </a>
                    <div className="flex items-center gap-4">
                        <p className="text-xs text-zinc-400 hidden sm:block max-w-xs text-right">
                            All processing happens in your browser
                        </p>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-12">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold tracking-tight text-zinc-50 mb-3">
                        {title}
                    </h1>
                    <p className="text-base text-zinc-400 leading-relaxed max-w-3xl">
                        {description}
                    </p>
                </div>

                <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm p-8 shadow-xl">
                    {children}
                </div>
            </main>

            <footer className="border-t border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl mt-20">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 text-xs text-zinc-400">
                    <span>PDF Studio — Client-side PDF toolbox</span>
                    <span>Built with Next.js, React, and pdf-lib</span>
                </div>
            </footer>
        </div>
    );
}
