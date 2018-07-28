const { google } = require('googleapis');
const http = require('http');
const opn = require('opn');
const querystring = require('querystring');
const shuffle = require('shuffle-array');
const url = require('url');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const youtube = google.youtube({ version: 'v3' });

function authenticate() {
  return new Promise((resolve, reject) => {
    const oAuth2Client = new OAuth2Client(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      [process.env.REDIRECT_URI],
    );

    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/youtube.force-ssl',
    });

    const server = http.createServer(async (req, res) => {
      if (req.url.includes('auth/callback')) {
        const qs = querystring.parse(url.parse(req.url).query);
        res.end('Authentication successful! Please return to the console.');
        server.close();

        const r = await oAuth2Client.getToken(qs.code)
        oAuth2Client.setCredentials(r.tokens);
        google.options({ auth: oAuth2Client });
        return resolve();
      }
    }).listen(3000, () => {
      opn(authorizeUrl);
    });
  });
}

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

authenticate()
  .then(() => playlistItemsListByPlaylistId(process.argv[2]))
  .then(shuffleItems)
  .then(process.exit)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
