"use client";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-50">
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-900/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              PDF Studio
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Privacy-first PDF toolbox
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden text-xs text-zinc-400 sm:block max-w-xs text-right">
              All processing happens in your browser
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-16">
        <section className="mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-50 mb-4">
            PDF Tools at Your Fingertips
          </h2>
          <p className="max-w-2xl mx-auto text-base text-zinc-400 leading-relaxed">
            Powerful PDF tools that run entirely in your browser. No uploads, no accounts, no tracking—just pure privacy and performance.
          </p>
        </section>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/tools/merge"
            className="group relative flex flex-col rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:border-emerald-500/50 hover:-translate-y-1"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 transition-opacity duration-300" />
            <div className="relative">
              <h3 className="text-lg font-semibold text-zinc-50 mb-2">
                Merge PDFs
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Combine multiple PDF files into a single document with custom ordering.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
                Open tool <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </a>

          <a
            href="/tools/split"
            className="group relative flex flex-col rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:border-emerald-500/50 hover:-translate-y-1"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 transition-opacity duration-300" />
            <div className="relative">
              <h3 className="text-lg font-semibold text-zinc-50 mb-2">
                Split PDF
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Split a PDF into multiple parts using page ranges or fixed-size chunks.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
                Open tool <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </a>

          <a
            href="/tools/page-manager"
            className="group relative flex flex-col rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:border-emerald-500/50 hover:-translate-y-1"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 transition-opacity duration-300" />
            <div className="relative">
              <h3 className="text-lg font-semibold text-zinc-50 mb-2">
                Page Manager
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Reorder, rotate, or delete pages in your PDF before exporting.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
                Open tool <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </a>

          <a
            href="/tools/images-to-pdf"
            className="group relative flex flex-col rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:border-emerald-500/50 hover:-translate-y-1"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 transition-opacity duration-300" />
            <div className="relative">
              <h3 className="text-lg font-semibold text-zinc-50 mb-2">
                Images to PDF
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Turn JPG or PNG images into a PDF with configurable orientation and size.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
                Open tool <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </a>

          <a
            href="/tools/extract-pages"
            className="group relative flex flex-col rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:border-emerald-500/50 hover:-translate-y-1"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 transition-opacity duration-300" />
            <div className="relative">
              <h3 className="text-lg font-semibold text-zinc-50 mb-2">
                Extract Pages
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Create a new PDF that contains only selected pages or ranges.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
                Open tool <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </a>

          <a
            href="/tools/extract-text"
            className="group relative flex flex-col rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:border-emerald-500/50 hover:-translate-y-1"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 transition-opacity duration-300" />
            <div className="relative">
              <h3 className="text-lg font-semibold text-zinc-50 mb-2">
                Extract Text
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Extract selectable text from non-scanned PDFs into a viewable area or downloadable file.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
                Open tool <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </a>

          <a
            href="/tools/page-numbers"
            className="group relative flex flex-col rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:border-emerald-500/50 hover:-translate-y-1"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 transition-opacity duration-300" />
            <div className="relative">
              <h3 className="text-lg font-semibold text-zinc-50 mb-2">
                Page Numbers
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Add page numbers to the header or footer with flexible formats and starting numbers.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
                Open tool <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </a>

          <a
            href="/tools/pdf-to-images"
            className="group relative flex flex-col rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:border-emerald-500/50 hover:-translate-y-1"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 transition-opacity duration-300" />
            <div className="relative">
              <h3 className="text-lg font-semibold text-zinc-50 mb-2">
                PDF to Images
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Convert PDF pages to PNG or JPG images. Download individual pages or all pages at once.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
                Open tool <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </a>

          <a
            href="/tools/rotate-pages"
            className="group relative flex flex-col rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:border-emerald-500/50 hover:-translate-y-1"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 transition-opacity duration-300" />
            <div className="relative">
              <h3 className="text-lg font-semibold text-zinc-50 mb-2">
                Rotate All Pages
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Rotate all pages in your PDF by 90, 180, or 270 degrees. Useful for fixing orientation issues.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
                Open tool <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </a>
        </section>
      </main>

      <footer className="border-t border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl mt-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 text-xs text-zinc-400">
          <span>PDF Studio — Client-side PDF toolbox</span>
          <span>No accounts. No uploads. Just your browser.</span>
        </div>
      </footer>
    </div>
  );
}
