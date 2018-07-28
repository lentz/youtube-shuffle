const { google } = require('googleapis');
const http = require('http');
const opn = require('opn');
const querystring = require('querystring');
const url = require('url');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

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

        // Now that we have the code, use that to acquire tokens.
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
  items = items.map(i => ({
    id: i.id,
    title: i.snippet.title,
    position: i.snippet.position,
    resourceId: i.snippet.resourceId,
  }));
  console.log(items.length);
}

async function playlistItemsListByPlaylistId(playlistId) {
  const youtube = google.youtube({ version: 'v3' });

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
