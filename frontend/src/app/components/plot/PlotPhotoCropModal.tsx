import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { C, sans, serif } from "../../theme";
import {
  PLOT_PHOTO_ASPECT,
  cropImageToFile,
} from "@/lib/cropImage";

type PlotPhotoCropModalProps = {
  imageSrc: string;
  fileName: string;
  onCancel: () => void;
  onConfirm: (file: File) => void | Promise<void>;
};

/**
 * Fixed-aspect crop mask before upload.
 * User pans/zooms inside a 5:2 frame; output is a capped JPEG File.
 */
export function PlotPhotoCropModal({
  imageSrc,
  fileName,
  onCancel,
  onConfirm,
}: PlotPhotoCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    [],
  );

  const handleConfirm = async () => {
    if (!croppedAreaPixels || busy) return;

    try {
      setBusy(true);
      setError(null);
      const file = await cropImageToFile(
        imageSrc,
        croppedAreaPixels,
        fileName,
      );
      await onConfirm(file);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not crop this photo.",
      );
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Crop plot photo"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(43, 43, 43, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "min(36rem, 100%)",
          background: C.card,
          borderRadius: "1rem",
          border: `0.0625rem solid ${C.border}`,
          boxShadow: "0 0.5rem 2rem rgba(44,31,20,0.18)",
          overflow: "hidden",
          ...sans,
        }}
      >
        <div style={{ padding: "1rem 1.125rem 0.5rem" }}>
          <h2
            style={{
              ...serif,
              margin: 0,
              fontSize: "1.05rem",
              fontWeight: 700,
              color: C.brown,
            }}
          >
            Frame your photo
          </h2>
          <p
            style={{
              margin: "0.35rem 0 0",
              fontSize: "0.78rem",
              color: C.brownLight,
              lineHeight: 1.45,
            }}
          >
            Drag and zoom to choose what shows in the 5:2 plot frame. Larger
            images are cropped to this size before upload.
          </p>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            height: "min(22rem, 55vh)",
            background: C.creamDark,
          }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={PLOT_PHOTO_ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid
          />
        </div>

        <div style={{ padding: "0.875rem 1.125rem 1.125rem" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontSize: "0.75rem",
              color: C.brownMid,
              fontWeight: 600,
            }}
          >
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              style={{ flex: 1 }}
            />
          </label>

          {error ? (
            <div
              style={{
                marginTop: "0.625rem",
                fontSize: "0.75rem",
                color: C.terra,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          ) : null}

          <div
            style={{
              marginTop: "0.875rem",
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              style={{
                background: C.creamDark,
                border: `0.0625rem solid ${C.border}`,
                borderRadius: "0.5625rem",
                padding: "0.5rem 0.875rem",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: C.brownMid,
                cursor: busy ? "not-allowed" : "pointer",
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={busy || !croppedAreaPixels}
              style={{
                background: C.sage,
                border: "none",
                borderRadius: "0.5625rem",
                padding: "0.5rem 0.875rem",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: C.white,
                cursor:
                  busy || !croppedAreaPixels ? "not-allowed" : "pointer",
                opacity: busy || !croppedAreaPixels ? 0.65 : 1,
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              {busy ? "Uploading…" : "Use this crop"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
