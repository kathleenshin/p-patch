export function weatherCodeToIconType(code: number | null | undefined): string {
  if (code == null) {
    return "cloud";
  }

  if (code >= 95) {
    return "storm";
  }

  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return "rain";
  }

  if (code <= 1) {
    return "sun";
  }

  return "cloud";
}