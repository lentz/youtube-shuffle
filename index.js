const http = require('http');
const querystring = require('querystring');
const url = require('url');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();
const { getPlaylists, setAuth, shufflePlaylist } = require('./shuffler');

const LAYOUT_START = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body>`;

const LAYOUT_FOOTER = `
  </body>
  </html>`;

function applyLayout(bodyContent) {
  return LAYOUT_START + bodyContent + LAYOUT_FOOTER;
}

async function shuffleRoute(req, res) {
  const parsedUrl = url.parse(req.url);
  const playlistId = parsedUrl.pathname.split('/')[2];
  shufflePlaylist(playlistId);
  res.end(
    `${LAYOUT_START}
    Shuffling playlist ${playlistId} at ${new Date()}!
    ${LAYOUT_FOOTER}`,
  );
}

async function authMiddleware(req, res) {
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
    const tokensResp = await oAuth2Client.getToken(qs.code);
    oAuth2Client.setCredentials(tokensResp.tokens);
    res.setHeader(
      'Set-Cookie',
      `token=${JSON.stringify(
        tokensResp.tokens,
      )}; Max-Age=2147483647;  HttpOnly`,
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

  setAuth(oAuth2Client);
}

http
  .createServer(async (req, res) => {
    try {
      const parsedUrl = url.parse(req.url);
      await authMiddleware(req, res);
      if (parsedUrl.pathname === '/' && !res.finished) {
        const playlists = await getPlaylists();
        const playlistsHTML = playlists
          .map((pl) => {
            return `<a href="/playlist/${pl.id}"><h2>${pl.snippet.title}</h2></a>`;
          })
          .join('<br />');
        res.end(applyLayout(playlistsHTML));
      } else if (parsedUrl.pathname.startsWith('/playlist/')) {
        await shuffleRoute(req, res);
      } else {
        res.statusCode = 404;
        res.end();
      }
    } catch (err) {
      res.statusCode = 500;
      res.end(err.toString());
    }
  })
  .listen(process.env.PORT, () => {
    console.log('Listening on port', process.env.PORT);
  });
