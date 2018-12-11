require('dotenv').config();
const { OAuth2Client } = require('google-auth-library');
const { setAuth, shufflePlaylist } = require('./shuffler');

const oAuth2Client = new OAuth2Client(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  [process.env.REDIRECT_URI],
);

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

setAuth(oAuth2Client);
shufflePlaylist(process.env.PLAYLIST_ID)
  .then(() => console.log('Shuffle complete!'))
  .catch(console.error);
