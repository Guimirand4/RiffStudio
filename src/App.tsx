import { useState } from 'react';
import { SongLibrary } from './components/SongLibrary';
import { Player } from './components/Player';
import type { Song } from './lib/songLibrary';

type View = 'library' | 'player';

export default function App() {
  const [view, setView] = useState<View>('library');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    setView('player');
  };

  const handleBackToLibrary = () => {
    setSelectedSong(null);
    setView('library');
  };

  return (
    <>
      {view === 'library' && (
        <SongLibrary onSelectSong={handleSelectSong} />
      )}
      {view === 'player' && selectedSong && (
        <Player song={selectedSong} onBack={handleBackToLibrary} />
      )}
    </>
  );
}
