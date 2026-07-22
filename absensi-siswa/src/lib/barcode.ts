import JsBarcode from 'jsbarcode';

/**
 * Generate barcode SVG from NIS
 * Format: SIS{NIS} - Code128
 */
export function generateBarcodeSVG(nis: string, options?: {
  width?: number;
  height?: number;
  fontSize?: number;
  margin?: number;
}): string {
  const barcodeValue = `SIS${nis}`;
  
  // Create a canvas element for jsbarcode to draw on
  const canvas = document.createElement('canvas');
  canvas.width = options?.width || 300;
  canvas.height = options?.height || 120;
  
  try {
    JsBarcode(canvas, barcodeValue, {
      format: 'CODE128',
      width: 2,
      height: options?.height || 100,
      displayValue: true,
      fontSize: options?.fontSize || 24,
      margin: options?.margin || 10,
      fontOptions: 'bold',
      font: 'monospace',
      textAlign: 'center',
      textPosition: 'bottom',
      textMargin: 8,
      background: '#ffffff',
      lineColor: '#000000',
    });

    // Convert canvas to SVG
    const svg = canvasToSVG(canvas, barcodeValue);
    return svg;
  } catch (e) {
    console.error('Barcode generation failed:', e);
    return generateFallbackSVG(barcodeValue);
  }
}

/**
 * Convert canvas to SVG string
 */
function canvasToSVG(canvas: HTMLCanvasElement, barcodeValue: string): string {
  const dataUrl = canvas.toDataURL('image/png');
  const width = canvas.width;
  const height = canvas.height;
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="white"/>
      <image href="${dataUrl}" width="${width}" height="${height}"/>
    </svg>
  `;
}

/**
 * Fallback SVG if jsbarcode fails
 */
function generateFallbackSVG(barcodeValue: string): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="120" viewBox="0 0 300 120">
      <rect width="300" height="120" fill="white"/>
      <text x="150" y="60" font-family="monospace" font-size="24" font-weight="bold" text-anchor="middle" fill="red">
        Barcode Error
      </text>
      <text x="150" y="90" font-family="monospace" font-size="16" text-anchor="middle" fill="gray">
        ${barcodeValue}
      </text>
    </svg>
  `;
}

/**
 * Parse scanned barcode to extract NIS
 * Expected format: SIS{NIS}
 */
export function parseBarcode(barcode: string): string | null {
  const match = barcode.match(/^SIS(\d+)$/i);
  return match ? match[1] : null;
}

/**
 * Generate barcode value from NIS
 */
export function getBarcodeFromNIS(nis: string): string {
  return `SIS${nis}`;
}

/**
 * Validate barcode format
 */
export function isValidBarcode(barcode: string): boolean {
  return /^SIS\d+$/i.test(barcode);
}

/**
 * Generate barcode as data URL (for PDF generation)
 */
export async function generateBarcodeDataURL(nis: string): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 160;
  
  return new Promise((resolve) => {
    try {
      JsBarcode(canvas, `SIS${nis}`, {
        format: 'CODE128',
        width: 2.5,
        height: 140,
        displayValue: true,
        fontSize: 28,
        margin: 15,
        fontOptions: 'bold',
        font: 'monospace',
        textAlign: 'center',
        textPosition: 'bottom',
        textMargin: 10,
        background: '#ffffff',
        lineColor: '#000000',
      });
      resolve(canvas.toDataURL('image/png'));
    } catch (e) {
      console.error('Barcode data URL generation failed:', e);
      // Return blank data URL
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`SIS${nis}`, canvas.width / 2, canvas.height / 2);
      }
      resolve(canvas.toDataURL('image/png'));
    }
  });
}