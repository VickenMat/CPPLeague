// app/rules/page.tsx
/* eslint-disable @next/next/no-img-element */
export default function RulesPage() {
  const PDF_PATH = '/ANFF Constitution.pdf';
  const PDF_URL = encodeURI(PDF_PATH);

  return (
    <div className="min-h-screen relative text-white px-6 py-10 bg-gradient-to-br from-gray-900 to-black">
      {/* Static background logo */}
      <img
        src="/logo_transparent.png"
        alt="Background Logo"
        className="fixed inset-0 w-full h-full object-contain opacity-[0.10] pointer-events-none select-none"
        style={{ objectPosition: 'center' }}
      />

      {/* Page content */}
      <div className="relative z-10">
        <h1 className="text-4xl font-extrabold text-center mb-6">League Rules</h1>

        <p className="text-center text-gray-300 mb-6">
          Open the constitution in a new tab or download the PDF below.
        </p>

        <section className="mx-auto w-full max-w-5xl">
          <div className="rounded-2xl border border-gray-800 bg-black/20 p-6">
            <div className="flex justify-center gap-3">
              <a
                href={PDF_URL}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl font-semibold text-black bg-[#D9D7B6] hover:bg-[#cfcdb3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                Open in new tab
              </a>
              <a
                href={PDF_URL}
                download
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
              >
                Download PDF
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
