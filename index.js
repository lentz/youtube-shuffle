const { google } = require('googleapis');
const http = require('http');
const querystring = require('querystring');
const shuffle = require('shuffle-array');
const url = require('url');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const youtube = google.youtube({ version: 'v3' });

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

async function getPlaylists() {
  const playlistsResp = await youtube.playlists.list(
    { part: 'snippet', mine: true, maxResults: 25 },
  );
  return playlistsResp.data.items.map(pl => {
    return `<a href="/playlist/${pl.id}"><h2>${pl.snippet.title}</h2></a>`;
  }).join('<br />');
}

async function shuffleRoute(req, res) {
  const parsedUrl = url.parse(req.url);
  const playlistId = parsedUrl.pathname.split('/')[2];
  console.log('Shuffling playlist ID', playlistId);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  const items = await playlistItemsListByPlaylistId(playlistId);
  await shuffleItems(items, res);
  res.end('Playlist shuffled!');
}

async function setAuth(req, res) {
  const qs = querystring.parse(url.parse(req.url).query);
  const oAuth2Client = new OAuth2Client(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    [process.env.REDIRECT_URI],
  );

  if (req.headers.cookie) {
    const tokens = JSON.parse(req.headers.cookie.split('=')[1]);
    oAuth2Client.setCredentials(tokens);
  } else if (qs.code) {
    const tokensResp = await oAuth2Client.getToken(qs.code)
    oAuth2Client.setCredentials(tokensResp.tokens);
    res.setHeader(
      'Set-Cookie',
      `token=${JSON.stringify(tokensResp.tokens)}; Max-Age=2147483647;  HttpOnly`,
    );
  } else {
    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/youtube.force-ssl',
      prompt: 'consent',
    });
    res.setHeader('Location', authorizeUrl);
    res.statusCode = 302;
    return res.end();
  }

  google.options({ auth: oAuth2Client });
}

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = url.parse(req.url);
    await setAuth(req, res);
    if (parsedUrl.pathname === '/' && !res.finished) {
      res.end(await getPlaylists());
    } else if (parsedUrl.pathname.startsWith('/playlist/')) {
      await shuffleRoute(req, res);
    }
    else {
      res.statusCode = 404;
      res.end();
    }
  } catch (err) {
    res.statusCode = 500;
    res.end(err.toString());
  }
}).listen(process.env.PORT, () => {
  console.log('Listening on port', process.env.PORT);
});
