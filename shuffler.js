const { google } = require('googleapis');
const shuffle = require('shuffle-array');

const youtube = google.youtube({ version: 'v3' });

async function shuffleItems(items) {
  shuffle(items);
  let position = 0;
  for (const item of items) {
    const params = {
      part: 'snippet',
      requestBody: {
        id: item.id,
        snippet: {
          playlistId: item.snippet.playlistId,
          position,
          resourceId: {
            kind: item.snippet.resourceId.kind,
            videoId: item.snippet.resourceId.videoId,
          },
        },
      },
    };
    const updateResp = await youtube.playlistItems.update(params);
    console.log(`shuffled ${position + 1} of ${items.length}`);
    if (updateResp.status !== 200) {
      throw new Error(updateResp);
    }
    position += 1;
  }
}

async function playlistItemsListByPlaylistId(playlistId) {
  let items = [];
  const params = { maxResults: '50', part: 'snippet', playlistId };
  let itemsResp;

  do {
    if (itemsResp && itemsResp.data.nextPageToken) {
      params.pageToken = itemsResp.data.nextPageToken;
    }

    itemsResp = await youtube.playlistItems.list(params);
    items = items.concat(itemsResp.data.items);
  } while (itemsResp.data.nextPageToken);

  return items;
}

async function getPlaylists() {
  const playlistsResp = await youtube.playlists.list({
    part: 'snippet',
    mine: true,
    maxResults: 25,
  });
  return playlistsResp.data.items;
}

async function shufflePlaylist(playlistId) {
  console.log('Shuffling playlist ID', playlistId);
  const items = await playlistItemsListByPlaylistId(playlistId);
  return shuffleItems(items);
}

async function setAuth(oAuth2Client) {
  google.options({ auth: oAuth2Client });
}

module.exports = {
  getPlaylists,
  setAuth,
  shufflePlaylist,
};
