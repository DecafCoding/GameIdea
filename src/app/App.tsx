/**
 * App shell: picks the screen from the address hash (routing in docs/architecture.html).
 * #/ and unknown addresses show the board list; #/board/{id} loads that board from storage
 * and shows the board screen once it is open; #/card-test keeps the Phase 1 card test page.
 */
import { BoardScreen } from './board/BoardScreen';
import { useBoardLoader } from './board/useBoardLoader';
import { CardTestPage } from './card-test/CardTestPage';
import { ListScreen } from './list/ListScreen';
import { useHashRoute } from './route';

export function App() {
  const route = useHashRoute();
  if (route.screen === 'card-test') return <CardTestPage />;
  if (route.screen === 'board') return <BoardRoute id={route.id} />;
  return <ListScreen />;
}

/** Shows nothing while the board loads, then the board screen, remounted on each load. */
function BoardRoute({ id }: { id: string }) {
  const load = useBoardLoader(id);
  if (load.state === 'loading') return null;
  return (
    <BoardScreen
      key={load.loadKey}
      changedElsewhere={load.changedElsewhere}
      onDismissChangedElsewhere={load.dismissChangedElsewhere}
    />
  );
}
