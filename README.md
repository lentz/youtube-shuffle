# YouTube Shuffle

This application will shuffle your YouTube playlists so that you can play a
shuffled playlist on YouTube platforms that don't support shuffled playback
such as the Apple TV.

## Getting Started

1. Visit https://youtubeshuffle.herokuapp.com
1. You will be redirected to Google to authenticate with your YouTube account
1. Click the name of the playlist you want to shuffle

## Development

Create a [Google Developer account](https://console.developers.google.com) and
create a set of OAuth 2.0 Client credentials. Be sure to enable the YouTube
Data API and set "http://localhost:3000" as an authorized redirect URL.

Copy `.env.example` to `.env` while adding the values for `CLIENT_ID` and
`CLIENT_SECRET` obtained from the Google Developer Console. This application
uses the [dotenv](https://www.npmjs.com/package/dotenv) package to make managing
environment variables easier, but all of the values in `.env.example` could also
be set as normal environment variables.

Start the web server: `npm run start`

Navigate to http://localhost:3000 in your browser.

### Headless Shuffling

If you have previously authenticated with YouTube Shuffle, you can shuffle a
specific playlist headlessly without the use of a browser.

1. Authenticate with YouTube Shuffle in your browser.
1. After successful authentication, obtain your refresh token from the `token`
   cookie that has been set in your browser. This cookie is a JSON object with a
   `refresh_token` property that contains the value you'll need.
1. Obtain the YouTube playlist ID of the playlist you want to shuffle. You'll
   see this value in the URL when viewing the playlist in a browser. For example,
   the playlist ID for `https://www.youtube.com/playlist?list=abc-123` is
   `abc-123`.
1. Add the `REFRESH_TOKEN` and `PLAYLIST_ID` keys and values to the `.env` file,
   or set them in your environment.
1. Run the shuffler: `node shufflePlaylist.js`
