export { initDatabase, getDb, persist, closeDatabase, getDbPath } from './database';
export {
  upsertTrack,
  getAllTracks,
  getTrackById,
  getTrackByPath,
  searchTracks,
  getAlbums,
  getArtists,
  getTrackCount,
  deleteTrack,
  deleteTracksNotIn,
  markPlayed,
  type TrackRow,
  type TrackInsert,
} from './trackRepository';
export {
  addScanFolder,
  removeScanFolder,
  getScanFolders,
  markFolderScanned,
  type ScanFolder,
} from './folderRepository';
export { getSetting, setSetting, deleteSetting } from './settingsRepository';
export {
  listPlaylists,
  getPlaylist,
  getPlaylistTracks,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
  setPlaylistTracks,
  countPlaylistTracks,
  type PlaylistRow,
  type PlaylistWithTracks,
  type PlaylistTrackRef,
} from './playlistRepository';
