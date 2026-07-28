export function PlantIcon({ size = 38 }: { size?: number }) {
  return (
    <div
      className="img-plant-icon"
      role="img"
      aria-label="plant"
      style={{ width: size, height: size }}
    />
  );
}
