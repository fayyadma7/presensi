"use client";

import { useEffect, useRef } from 'react';
import { generateBarcodeSVG } from '@/lib/barcode';

interface BarcodeDisplayProps {
  nis: string;
  name?: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showInfo?: boolean;
  onLoad?: () => void;
}

const sizeConfig = {
  small: { width: 2, height: 40, fontSize: 12, margin: 8 },
  medium: { width: 2.5, height: 55, fontSize: 14, margin: 10 },
  large: { width: 3, height: 75, fontSize: 18, margin: 12 },
};

export default function BarcodeDisplay({ 
  nis, 
  name, 
  className, 
  size = 'large', 
  showInfo = true,
  onLoad,
}: BarcodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const config = sizeConfig[size];

  useEffect(() => {
    if (!svgRef.current || !nis) return;
    
    try {
      // Clear existing content
      svgRef.current.innerHTML = '';
      
      // Generate new barcode
      import('jsbarcode').then(({ default: JsBarcode }) => {
        JsBarcode(svgRef.current!, `SIS${nis}`, {
          format: 'CODE128',
          displayValue: true,
          fontSize: config.fontSize,
          font: 'monospace',
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 6,
          width: config.width,
          height: config.height,
          margin: config.margin,
          background: '#FFFFFF',
          lineColor: '#1E1B4B',
        });
        onLoad?.();
      }).catch(() => {
        console.warn('jsbarcode gagal dimuat — kemungkinan diblokir ekstensi');
      });
    } catch (e) {
      console.error('Barcode generation error:', e);
    }
  }, [nis, size, config, onLoad]);

  return (
    <div className="flex flex-col items-center gap-3 p-4 clay-card rounded-2xl">
      <div className="w-full flex justify-center">
        <svg 
          ref={svgRef} 
          className="max-w-full h-auto"
          style={{ maxWidth: size === 'large' ? '360px' : size === 'medium' ? '280px' : '200px' }}
        />
      </div>
      
      {showInfo && (name || className) && (
        <div className="text-center space-y-1">
          {name && <p className="font-heading text-lg font-bold text-foreground">{name}</p>}
          <p className="font-mono text-sm font-semibold text-primary">NIS: {nis}</p>
          {className && <p className="text-sm text-muted-foreground">Kelas: {className}</p>}
        </div>
      )}
    </div>
  );
}