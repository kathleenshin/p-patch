import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PLOT_PHOTO_ASPECT,
  PLOT_PHOTO_MAX_EDGE,
  cropImageToFile,
} from "@/lib/cropImage";

describe("cropImage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exports the fixed 5:2 plot photo aspect and max edge", () => {
    expect(PLOT_PHOTO_ASPECT).toBe(5 / 2);
    expect(PLOT_PHOTO_MAX_EDGE).toBe(1600);
  });

  it("crops to a JPEG File and caps the long edge", async () => {
    const drawImage = vi.fn();
    const toBlob = vi.fn(
      (
        callback: BlobCallback,
        _type?: string,
        _quality?: number,
      ) => {
        callback(new Blob(["jpeg-bytes"], { type: "image/jpeg" }));
      },
    );

    vi.spyOn(document, "createElement").mockImplementation(((
      tagName: string,
    ) => {
      if (tagName === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage }),
          toBlob,
        } as unknown as HTMLCanvasElement;
      }
      return document.createElement(tagName);
    }) as typeof document.createElement);

    class FakeImage {
      width = 4000;
      height = 3000;
      onload: ((ev: Event) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      addEventListener(type: string, listener: EventListener) {
        if (type === "load") {
          this.onload = listener as (ev: Event) => void;
        }
        if (type === "error") {
          this.onerror = listener as (ev: Event) => void;
        }
      }
      set src(_value: string) {
        queueMicrotask(() => {
          this.onload?.(new Event("load"));
        });
      }
    }

    vi.stubGlobal("Image", FakeImage);

    const file = await cropImageToFile(
      "blob:fake-source",
      { x: 10, y: 20, width: 3000, height: 1200 },
      "garden.png",
    );

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("garden.jpg");
    expect(file.type).toBe("image/jpeg");

    // Long edge 3000 scales to PLOT_PHOTO_MAX_EDGE (1600).
    expect(drawImage).toHaveBeenCalledWith(
      expect.any(FakeImage),
      10,
      20,
      3000,
      1200,
      0,
      0,
      1600,
      640,
    );
    expect(toBlob).toHaveBeenCalled();
  });

  it("rejects when the image fails to load", async () => {
    class FailingImage {
      addEventListener(type: string, listener: EventListener) {
        if (type === "error") {
          queueMicrotask(() => {
            (listener as (ev: Event) => void)(new Event("error"));
          });
        }
      }
      set src(_value: string) {
        // error listener scheduled in addEventListener
      }
    }

    vi.stubGlobal("Image", FailingImage);

    await expect(
      cropImageToFile(
        "blob:broken",
        { x: 0, y: 0, width: 100, height: 40 },
        "broken.jpg",
      ),
    ).rejects.toThrow("Could not load the selected image.");
  });
});
