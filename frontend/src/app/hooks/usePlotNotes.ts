import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  createPlotNote,
  fetchPlotNotes,
  type PlotNoteRecord,
} from "@/api/plotNotes";

export function usePlotNotes(plotId?: number) {
  const { accessToken } = useAuth();

  const [notes, setNotes] = useState<PlotNoteRecord[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (!accessToken || !plotId) {
      setNotes([]);
      setNotesLoading(false);
      return;
    }

    try {
      setNotesLoading(true);
      setNotesError(null);

      const data = await fetchPlotNotes(accessToken, plotId);
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
  }, [accessToken, plotId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  async function createNote(
    content: string,
    visibility: PlotNoteRecord["visibility"]
  ) {
    if (!accessToken || !plotId) {
      return;
    }

    try {
      setNotesError(null);

      await createPlotNote(accessToken, {
        plot: plotId,
        content,
        visibility,
      });

      await loadNotes();
    } catch (error) {
      setNotesError(
        error instanceof Error
          ? error.message
          : "Unable to create plot note."
      );

      throw error;
    }
  }

  return {
    notes,
    notesLoading,
    notesError,
    createNote,
  };
}