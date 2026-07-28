import plantIconPng from "../../imports/DashboardPlotPlantIcon.png";

export function PlantIcon({ size = 38 }: { size?: number }) {
  return (
    <img
      src={plantIconPng}
      alt="plant"
      width={size}
      height={size}
      style={{ objectFit: "contain", display: "block" }}
    />
  );
}
