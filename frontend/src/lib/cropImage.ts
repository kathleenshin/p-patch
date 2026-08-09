import type { Area } from "react-easy-crop";

/**
 * Fixed crop aspect for plot photos (width / height).
 * 5/2 keeps height at 2/5 of width.
 */
export const PLOT_PHOTO_ASPECT = 5 / 2;

/** Long-edge cap so uploads stay reasonably small for local/S3 storage. */
export const PLOT_PHOTO_MAX_EDGE = 1600;

/** JPEG quality for the cropped upload blob. */
export const PLOT_PHOTO_JPEG_QUALITY = 0.9;

/**
 * Draw the cropped region onto a canvas and return a File ready for upload.
 * Scales down so the longer edge is at most PLOT_PHOTO_MAX_EDGE.
 */
export async function cropImageToFile(
  imageSrc: string,
  crop: Area,
  fileName: string,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not prepare the cropped image.");
  }

  // Scale output so the longer edge never exceeds the cap.
  const scale = Math.min(
    1,
    PLOT_PHOTO_MAX_EDGE / Math.max(crop.width, crop.height),
  );
  const outputWidth = Math.round(crop.width * scale);
  const outputHeight = Math.round(crop.height * scale);

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const blob = await canvasToJpegBlob(canvas);
  const baseName = fileName.replace(/\.[^.]+$/, "") || "plot-photo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Could not load the selected image.")),
    );
    image.src = src;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode the cropped image."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      PLOT_PHOTO_JPEG_QUALITY,
    );
  });
}
