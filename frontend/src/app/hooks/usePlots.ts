import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { fetchPlots, type PlotRecord } from "@/api/plots";

type SharedFetch = {
  token: string;
  controller: AbortController;
  promise: Promise<PlotRecord[]>;
};

let cacheToken: string | null = null;
let cachePlots: PlotRecord[] | null = null;
let cacheError: string | null = null;
let sharedFetch: SharedFetch | null = null;

export function usePlots() {
  const { accessToken } = useAuth();

  const [plots, setPlots] = useState<PlotRecord[]>([]);
  const [plotsLoading, setPlotsLoading] = useState(true);
  const [plotsError, setPlotsError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadPlots() {
      if (!accessToken) {
        if (sharedFetch) {
          sharedFetch.controller.abort();
          sharedFetch = null;
        }

        cacheToken = null;
        cachePlots = null;
        cacheError = null;

        setPlots([]);
        setPlotsError(null);
        setPlotsLoading(false);
        return;
      }

      if (
        cacheToken === accessToken &&
        (cachePlots !== null || cacheError !== null)
      ) {
        setPlots(cachePlots ?? []);
        setPlotsError(cacheError);
        setPlotsLoading(false);
        return;
      }

      if (sharedFetch && sharedFetch.token !== accessToken) {
        sharedFetch.controller.abort();
        sharedFetch = null;
      }

      try {
        setPlotsLoading(true);
        setPlotsError(null);

        if (!sharedFetch || sharedFetch.token !== accessToken) {
          const controller = new AbortController();
          sharedFetch = {
            token: accessToken,
            controller,
            promise: fetchPlots(accessToken, controller.signal),
          };
        }

        const data = await sharedFetch.promise;

        cacheToken = accessToken;
        cachePlots = data;
        cacheError = null;

        if (sharedFetch?.token === accessToken) {
          sharedFetch = null;
        }

        if (!ignore) {
          setPlots(data);
          setPlotsError(null);
        }
      } catch (error) {
        const aborted =
          error instanceof DOMException &&
          error.name === "AbortError";

        if (sharedFetch?.token === accessToken) {
          sharedFetch = null;
        }

        if (!aborted && !ignore) {
          const message =
            error instanceof Error ? error.message : "Unable to load plots.";

          cacheToken = accessToken;
          cachePlots = [];
          cacheError = message;

          setPlotsError(message);
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
    };
  }, [accessToken]);

  return {
    plots,
    plotsLoading,
    plotsError,
  };
}