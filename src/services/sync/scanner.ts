// Camera QR Code Scanner with BarcodeDetector and fallback

export interface ScannerCallbacks {
  onDetected: (scannedText: string) => void;
  onError: (errorMsg: string) => void;
}

export class QrCameraScanner {
  private videoEl: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private isScanning = false;
  private animFrameId: number | null = null;
  private detector: any = null;

  static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof (window as any).BarcodeDetector !== 'undefined'
    );
  }

  async start(videoElement: HTMLVideoElement, callbacks: ScannerCallbacks): Promise<boolean> {
    this.stop();
    this.videoEl = videoElement;

    if (typeof (window as any).BarcodeDetector !== 'undefined') {
      try {
        this.detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch (_) {
        this.detector = null;
      }
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      this.videoEl.srcObject = this.stream;
      await this.videoEl.play();
      this.isScanning = true;

      this.scanLoop(callbacks);
      return true;
    } catch (err: any) {
      this.stop();
      callbacks.onError(err.name === 'NotAllowedError' ? 'Camera access denied' : err.message || 'Could not open camera');
      return false;
    }
  }

  private scanLoop(callbacks: ScannerCallbacks): void {
    if (!this.isScanning || !this.videoEl || !this.detector) return;

    if (this.videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.detector
        .detect(this.videoEl)
        .then((barcodes: any[]) => {
          if (!this.isScanning) return;
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue) {
              this.stop();
              callbacks.onDetected(rawValue);
              return;
            }
          }
          this.animFrameId = requestAnimationFrame(() => this.scanLoop(callbacks));
        })
        .catch(() => {
          if (this.isScanning) {
            this.animFrameId = requestAnimationFrame(() => this.scanLoop(callbacks));
          }
        });
    } else {
      this.animFrameId = requestAnimationFrame(() => this.scanLoop(callbacks));
    }
  }

  stop(): void {
    this.isScanning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
      this.videoEl = null;
    }
  }
}
