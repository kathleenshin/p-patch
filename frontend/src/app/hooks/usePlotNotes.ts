import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  fetchPlotNotes,
  type PlotNoteRecord,
} from "@/api/plotNotes";

export function usePlotNotes(plotId?: number) {
  const { accessToken } = useAuth();

  const [notes, setNotes] = useState<PlotNoteRecord[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);

  useEffect(() => {
    async function loadNotes() {
      if (!accessToken || !plotId) {
        setNotes([]);
        setNotesLoading(false);
        return;
      }

      try {
        setNotesLoading(true);
        setNotesError(null);

        const data = await fetchPlotNotes(
          accessToken,
          plotId
        );

        setNotes(data);
      } catch (error) {
        setNotesError(
          error instanceof Error
            ? error.message
            : "Unable to load plot notes."
        );
      } finally {
        setNotesLoading(false);
      }
    }

    void loadNotes();
  }, [accessToken, plotId]);

  return {
    notes,
    notesLoading,
    notesError,
  };
}