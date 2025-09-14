// PDF Export with Puppeteer (optional)
// Gracefully handles when puppeteer is not installed

let puppeteer: any = null;

// Try to load puppeteer if available
try {
  puppeteer = require('puppeteer');
  console.log('✓ PDF export enabled (puppeteer found)');
} catch (error) {
  console.log('○ PDF export disabled (install puppeteer to enable)');
}

export async function generatePDF(html: string): Promise<Buffer | null> {
  if (!puppeteer) {
    console.log('PDF generation skipped - puppeteer not installed');
    console.log('To enable PDF export, run: npm install puppeteer');
    return null;
  }

  try {
    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
          Board Packet - ${new Date().toLocaleDateString()}
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `
    });

    await browser.close();
    
    return pdfBuffer;
  } catch (error) {
    console.error('PDF generation failed:', error);
    return null;
  }
}

export async function generatePDFFromFile(
  htmlPath: string,
  outputPath: string
): Promise<boolean> {
  if (!puppeteer) {
    return false;
  }

  try {
    const fs = await import('fs/promises');
    const html = await fs.readFile(htmlPath, 'utf-8');
    const pdfBuffer = await generatePDF(html);
    
    if (pdfBuffer) {
      await fs.writeFile(outputPath, pdfBuffer);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('PDF file generation failed:', error);
    return false;
  }
}

// Alternative PDF generation using system print dialog (for environments without puppeteer)
export function generatePrintCommand(htmlPath: string): string {
  const platform = process.platform;
  
  if (platform === 'win32') {
    // Windows: Open in default browser and trigger print
    return `start "" "${htmlPath}"`;
  } else if (platform === 'darwin') {
    // macOS: Open in Safari and trigger print
    return `open -a Safari "${htmlPath}"`;
  } else {
    // Linux: Try to open in firefox
    return `firefox --new-window "${htmlPath}"`;
  }
}

// Check if PDF generation is available
export function isPDFGenerationAvailable(): boolean {
  return puppeteer !== null;
}

// Export configuration for optimal PDF rendering
export const pdfConfig = {
  pageSize: 'A4',
  margins: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
  },
  styles: `
    @media print {
      body {
        font-size: 11pt;
        line-height: 1.5;
      }
      .page-break {
        page-break-after: always;
      }
      .no-print {
        display: none !important;
      }
      .print-only {
        display: block !important;
      }
      h1 {
        font-size: 24pt;
      }
      h2 {
        font-size: 18pt;
        page-break-after: avoid;
      }
      h3 {
        font-size: 14pt;
        page-break-after: avoid;
      }
      table {
        page-break-inside: avoid;
      }
      tr {
        page-break-inside: avoid;
      }
    }
  `
};

