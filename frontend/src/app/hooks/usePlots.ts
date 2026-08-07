import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { fetchPlots, type PlotRecord } from "@/api/plots";

export function usePlots() {
  const { accessToken } = useAuth();

  const [plots, setPlots] = useState<PlotRecord[]>([]);
  const [plotsLoading, setPlotsLoading] = useState(true);
  const [plotsError, setPlotsError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function loadPlots() {
      if (!accessToken) {
        setPlots([]);
        setPlotsError(null);
        setPlotsLoading(false);
        return;
      }

      try {
        setPlotsLoading(true);
        setPlotsError(null);

        const data = await fetchPlots(
          accessToken,
          controller.signal,
        );

        if (!ignore) {
          setPlots(data);
        }
      } catch (error) {
        const aborted =
          error instanceof DOMException &&
          error.name === "AbortError";

        if (!aborted && !ignore) {
          setPlotsError(
            error instanceof Error ? error.message : "Unable to load plots."
          );
        }
      } finally {
        if (!ignore) {
          setPlotsLoading(false);
        }
      }
    }

    void loadPlots();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [accessToken]);

  return {
    plots,
    plotsLoading,
    plotsError,
  };
}