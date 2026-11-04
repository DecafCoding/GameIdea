/**
 * GenresPanel: a thin Dialog wrapper around GenresTab, kept for one step while the board
 * screen moves to the Settings Genres tab. Removed in the next step.
 */
import { Button, Dialog } from '@/shared/ui';
import type { DeckGenres } from '@/shared/model';
import { GENRES_FOOTER_TEXT, GENRES_SCOPE_TEXT, GenresTab } from './GenresTab';

interface GenresPanelProps {
  genres: DeckGenres;
  onChange: (genres: DeckGenres) => void;
  onClose: () => void;
}

export function GenresPanel({ genres, onChange, onClose }: GenresPanelProps) {
  return (
    <Dialog
      open
      size="panel"
      showClose
      title="Genres"
      caption={GENRES_SCOPE_TEXT}
      footerNote={GENRES_FOOTER_TEXT}
      onClose={onClose}
      actions={
        <Button variant="primary" data-autofocus onClick={onClose}>
          Done
        </Button>
      }
    >
      <GenresTab genres={genres} onChange={onChange} />
    </Dialog>
  );
}
