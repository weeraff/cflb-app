// Manually maintained: no feed (YouTube or Spotify RSS) carries guest
// names, so there's nothing to sync automatically. Add one entry per
// guest appearance and the Podcast page turns it into a clickable link
// that jumps straight to that episode.
//
// episodeId is the YouTube video id (e.g. from a /watch?v=... or
// /shorts/... URL) or, for a Spotify-only episode, the RSS <guid>.
//
// Example:
// { name: 'Jane Smith', episodeId: 'SE6iDJVWBE8' },

export const podcastGuests = []
