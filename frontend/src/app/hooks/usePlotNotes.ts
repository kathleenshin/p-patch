import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  createPlotNote,
  fetchPlotNotes,
  type CreatePlotNoteInput,
  type PlotNoteRecord,
} from "@/api/plotNotes";

export function usePlotNotes(plotId?: number) {
  const { accessToken } = useAuth();

  const [notes, setNotes] = useState<PlotNoteRecord[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);

  const createNote = useCallback(
    async (
      content: string,
      visibility: CreatePlotNoteInput["visibility"]
    ) => {
      if (!accessToken) {
        throw new Error("You must be signed in to add a note.");
      }

      if (!plotId) {
        throw new Error("Select a plot before adding a note.");
      }

      const created = await createPlotNote(accessToken, {
        plot: plotId,
        content,
        visibility,
      });

      setNotes((current) => [created, ...current]);
      return created;
    },
    [accessToken, plotId]
  );

  useEffect(() => {
    let ignore = false;

    async function loadNotes() {
      if (!accessToken || !plotId) {
        if (!ignore) {
          setNotes([]);
          setNotesError(null);
          setNotesLoading(false);
        }
        return;
      }

      try {
        if (!ignore) {
          setNotesLoading(true);
          setNotesError(null);
        }

        const data = await fetchPlotNotes(
          accessToken,
          plotId
        );

        if (!ignore) {
          setNotes(data);
        }
      } catch (error) {
        if (!ignore) {
          setNotesError(
            error instanceof Error
              ? error.message
              : "Unable to load plot notes."
          );
        }
      } finally {
        if (!ignore) {
          setNotesLoading(false);
        }
      }
    }

    void loadNotes();

    return () => {
      ignore = true;
    };
  }, [accessToken, plotId]);

  return {
    notes,
    notesLoading,
    notesError,
    createNote,
  };
}