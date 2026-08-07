import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { fetchPlots, type PlotRecord } from "@/api/plots";

export function usePlots() {
  const { accessToken } = useAuth();

  const [plots, setPlots] = useState<PlotRecord[]>([]);
  const [plotsLoading, setPlotsLoading] = useState(true);
  const [plotsError, setPlotsError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlots() {
      if (!accessToken) {
        setPlotsLoading(false);
        return;
      }

      try {
        setPlotsLoading(true);
        setPlotsError(null);

        const data = await fetchPlots(accessToken);
        setPlots(data);
      } catch (error) {
        setPlotsError(
          error instanceof Error ? error.message : "Unable to load plots."
        );
      } finally {
        setPlotsLoading(false);
      }
    }

    void loadPlots();
  }, [accessToken]);

  return {
    plots,
    plotsLoading,
    plotsError,
  };
}