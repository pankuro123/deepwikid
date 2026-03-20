# How to Download the Wiki in PDF Format

DeepWiki offers a functionality to export the entire generated documentation into a professional, LaTeX-styled PDF document. This feature is implemented entirely on the client-side to minimize server resource usage and allow rapid previews.

## Technical Explanation

The PDF generation process skips server-side HTML-to-PDF libraries (like Puppeteer) and instead leverages the user's native browser print dialog.

1. **Aggregation:** When the user clicks the "Download PDF" button, the `downloadPdf` function in `src/app/[owner]/[repo]/page.tsx` aggregates all the locally generated Markdown content (`generatedPages`).
2. **Custom Rendering:** It configures the `marked` library with a custom Markdown renderer that intercepted `mermaid` code blocks and wraps them in specialized `<div class="mermaid">` containers. This allows the Mermaid JS library to target them later.
3. **New Print Window:** A new empty browser window is spawned (`window.open('', '_blank')`).
4. **HTML Construction:** An entire HTML document string is constructed. This document includes:
   - The converted HTML content of all wiki pages.
   - LaTeX-inspired CSS stylesheets (importing "CMU Serif" and "CMU Typewriter" fonts) and GitHub Markdown CSS overrides to simulate an academic/scientific publication.
   - The Mermaid JS library via CDN.
5. **Execution:** The constructed HTML is written to the new window. An `onload` script inside the new window initializes Mermaid to draw the SVG diagrams. After a 2-second timeout (to ensure fonts and heavy SVGs are fully rendered), `window.print()` is called automatically, prompting the user to save the result as a PDF via the browser's native print-to-PDF feature.

## Relevant Code Snippet
From `src/app/[owner]/[repo]/page.tsx`:

```typescript
// Function to download PDF (Client-side Print)
const downloadPdf = useCallback(async () => {
  if (!wikiStructure || Object.keys(generatedPages).length === 0) {
    setExportError('No wiki content to export');
    return;
  }

  try {
    setIsExporting(true);
    // ...
    const title = wikiStructure.title || \`\${repoName} Wiki\`;

    // Configure marked to handle mermaid blocks appropriately
    const renderer = new marked.Renderer();
    const originalCodeRenderer = renderer.code.bind(renderer);
    renderer.code = ({ text, lang }: { text: string, lang?: string }) => {
      if (lang === 'mermaid') {
        return \`<div class="mermaid">\${text}</div>\`;
      }
      // ...
    };

    marked.setOptions({ renderer });

    // Generate HTML Content by mapping over generated pages
    let contentHtml = '';
    const pagesToExport = wikiStructure.pages;

    for (const page of pagesToExport) {
      const pageContent = generatedPages[page.id]?.content || '';
      const html = await marked.parse(pageContent);

      contentHtml += \`
        <div id="page-\${page.id}" class="page-container">
          <h2 class="page-title">\${page.title}</h2>
          <div class="content markdown-body">\${html}</div>
        </div>
      \`;
    }

    // Open new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) throw new Error('Pop-up blocked.');

    // Construct the full HTML document string
    const htmlDocument = \`
      <!DOCTYPE html>
      <html lang="\${language}">
      <head>
        <!-- Font, CSS, and Mermaid library imports -->
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js"></script>
        <!-- LaTeX styled CSS -->
        <style>
          body { font-family: "CMU Serif", serif; /* ... */ }
          /* ... Custom styles for print media and page-breaks ... */
        </style>
      </head>
      <body>
        <div class="wiki-header"><div class="wiki-title">\${title}</div></div>
        \${contentHtml}
        
        <script>
          // Initialize Mermaid
          mermaid.initialize({ startOnLoad: true, theme: 'neutral', fontFamily: '"CMU Serif", serif' });
          
          // Wait for Mermaid to render then trigger print
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 2000); // Wait for fonts and diagrams
          };
        </script>
      </body>
      </html>
    \`;

    printWindow.document.write(htmlDocument);
    printWindow.document.close();

  } catch (err) {
    // Error handling
  } finally {
    setIsExporting(false);
  }
}, [wikiStructure, generatedPages, effectiveRepoInfo, language]);
```
