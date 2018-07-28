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

async function shuffleItems(items, res) {
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
    res.write(`Updating video ${position + 1} of ${items.length}<br/>`);
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

async function shuffleRoute(qs, res) {
  const r = await oAuth2Client.getToken(qs.code)
  oAuth2Client.setCredentials(r.tokens);
  google.options({ auth: oAuth2Client });

  console.log('Shuffling playlist ID', qs.state);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  const items = await playlistItemsListByPlaylistId(qs.state);
  await shuffleItems(items, res);
  res.end('Playlist shuffled!');
}

function authRoute(parsedUrl, res) {
  const playlistId = parsedUrl.path.substr(1);
  if (!playlistId) {
    res.statusCode = 400;
    return res.end('ERROR: playlistId missing from path!');
  }

  const authorizeUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: 'https://www.googleapis.com/auth/youtube.force-ssl',
    state: playlistId,
  });
  res.setHeader('Location', authorizeUrl);
  res.statusCode = 302;
  res.end();
}

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = url.parse(req.url);
    if (parsedUrl.path.startsWith('/auth/callback')) {
      await shuffleRoute(querystring.parse(parsedUrl.query), res);
    } else {
      authRoute(parsedUrl, res);
    }
  } catch (err) {
    res.statusCode = 500;
    res.end(err.toString());
  }
}).listen(process.env.PORT, () => {
  console.log('Listening on port', process.env.PORT);
});
