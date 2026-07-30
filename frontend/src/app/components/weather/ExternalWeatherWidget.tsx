import { useEffect, useRef } from "react";
import { C } from "../../theme";

export function ExternalWeatherWidget() {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    el.setAttribute("v", "1.3");
    el.setAttribute("loc", "id");
    el.setAttribute("a", JSON.stringify({
      t: "responsive", lang: "en", sl_lpl: 1, ids: ["wl3620"],
      font: "Arial", sl_ics: "one_a", sl_sot: "fahrenheit", cl_bkg: "image",
      cl_font: "#FFFFFF", cl_cloud: "#FFFFFF", cl_persp: "#81D4FA",
      cl_sun: "#FFC107", cl_moon: "#FFC107", cl_thund: "#FF5722",
    }));

    const scriptId = "ww-weather-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://app3.weatherwidget.org/js/?id=ww_d1c8be0e3c255";
      script.async = true;
      document.body.appendChild(script);
    } else {
      // Re-init if already loaded
      (window as any).ww_d1c8be0e3c255?.init?.();
    }
  }, []);

  return (
    <div style={{ borderRadius: "1.125rem", overflow: "hidden",
      border: `0.0938rem solid ${C.sageMid}`, minHeight: "6.25rem" }}>
      <div ref={divRef} id="ww_d1c8be0e3c255" style={{ width: "100%" }}>
        <span style={{ fontSize: "0.75rem", color: C.muted }}>Loading weather…</span>
      </div>
    </div>
  );
}
