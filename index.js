const { google } = require('googleapis');
const http = require('http');
const querystring = require('querystring');
const shuffle = require('shuffle-array');
const url = require('url');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const youtube = google.youtube({ version: 'v3' });

const oAuth2Client = new OAuth2Client(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  [process.env.REDIRECT_URI],
);

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
    if (updateResp.status !== 200) { throw new Error(updateResp); }
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

const server = http.createServer(async (req, res) => {
  try {
    const qs = querystring.parse(url.parse(req.url).query);
    if (req.url.includes('auth/callback')) {
      const r = await oAuth2Client.getToken(qs.code)
      oAuth2Client.setCredentials(r.tokens);
      google.options({ auth: oAuth2Client });

      const items = await playlistItemsListByPlaylistId(qs.state);
      await shuffleItems(items);
      res.end('Shuffled!');
    } else {
      const authorizeUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/youtube.force-ssl',
        state: qs.playlistId,
      });
      res.setHeader('Location', authorizeUrl);
      res.statusCode = 302;
      res.end();
    }
  } catch(err) {
    res.statusCode = 500;
    res.end(err);
  }
}).listen(process.env.PORT, () => {
  console.log('Listening on port', process.env.PORT);
});
