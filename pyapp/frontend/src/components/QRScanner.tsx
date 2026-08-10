import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Icon } from "./Icon";

interface QRScannerProps {
  onScan: (value: string) => void;
  onError?: (message: string) => void;
  scanning: boolean;
  className?: string;
}

export default function QRScanner({
  onScan,
  onError,
  scanning,
  className,
}: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scannerId] = useState(() => `qr-scanner-${Math.random().toString(36).slice(2, 11)}`);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!containerRef.current) return;

    const scanner = new Html5Qrcode(scannerId, {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      useBarCodeDetectorIfSupported: true,
      verbose: undefined,
    });
    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .catch(() => {})
            .finally(() => {
              scannerRef.current?.clear();
              scannerRef.current = null;
            });
        } else {
          scannerRef.current.clear();
          scannerRef.current = null;
        }
      }
    };
  }, [scannerId]);

  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner || !containerRef.current) return;

    const cameraConfig = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1,
    };

    const reportError = (message: string) => {
      setError(message);
      onError?.(message);
    };

    const start = async () => {
      try {
        setError("");
        await scanner.start(
          { facingMode: "environment" },
          cameraConfig,
          (decodedText) => {
            if (!decodedText || !scanner.isScanning) return;
            scanner.stop().catch(() => {});
            onScan(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        const msg = err?.message || "Failed to start camera scanner.";
        reportError(msg);
      }
    };

    if (scanning) {
      start();
    } else if (scanner.isScanning) {
      scanner.stop().catch(() => {});
    }
  }, [scanning, onScan, onError]);

  return (
    <div className={className}>
      <div
        ref={containerRef}
        id={scannerId}
        className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl"
      />
      {error && (
        <div className="alert alert-error mt-3">
          <Icon name="alert" className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
