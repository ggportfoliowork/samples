<?php

namespace App\Services\Songs;

use Cache;
use SpotifyWebAPI\Session;
use Alaouy\Youtube\Youtube;
use App\Traits\UsesCacheTrait;
use SpotifyWebAPI\SpotifyWebAPI;

/**
 * Class SongsSearcher
 * @package App\Services\Songs
 */
class SongSearcher
{
    /**
     * @var Youtube
     */
    protected $youtube;

    protected $spotify;

    use UsesCacheTrait;

    /**
     * SongsSearcher constructor.
     */
    public function __construct()
    {
        try {
            $this->youtube = new Youtube(env('YOUTUBE_API_KEY'));
        } catch(\Exception $e) {
            throw new \Exception($e);
        }

        try {
            $session = new Session(
                env('SPOTIFY_CLIENT_ID'),
                env('SPOTIFY_CLIENT_SECRET'),
                env('SPOTIFY_REDIRECT')
            );

            $session->requestCredentialsToken();

            $accessToken = $session->getAccessToken();

            $this->spotify = new SpotifyWebAPI();
            $this->spotify->setAccessToken($accessToken);

        } catch(\Exception $e) {
            throw new \Exception($e);
        }
    }

    public function getNewReleasesFromSpotify()
    {
        $songs = $this->spotify->getNewReleases();
        return $songs;
    }

    public function getFeaturedFromSpotify()
    {
        $songs = $this->spotify->getFeaturedPlaylists();
        return $songs;
    }

    public function getNewReleasesFromYouTube()
    {
        $data['q'] = "";
        $part = ['snippet'];
        $options = [
            'offset' => 1
        ];

        if ($this->cache()->getCacheKey(md5($data['q']) && !isset($options['offset']))) {
            $songs = $this->cache()->getCacheKey(md5($data['q']));
            return $songs;
        } else {
            try {
                $songs = $this->youtube->searchAdvanced([
                    'q' => '',
                    'pageToken' => null,
                    'videoCategoryId' => config('musenyx.yt_category_id'),
                    'part' => implode(', ', $part),
                    'type' => 'video',
                    'maxResults' => 50,
                    'order' => 'viewCount',
                ], true);
                $this->cache()->setCacheData(md5($data['q']), $songs);
                return $songs;
            } catch (\Exception $e) {
                throw new \Exception($e);
            }
        }
    }

    /**
     * @param array $data
     * @return array
     */
    public function search($data = [])
    {
        $part = ['id', 'snippet'];

        $options = [];

        $options['limit'] = 21;

        if(isset($data['offset'])) {
            $options['offset'] = $data['offset'];
        }

        if($this->cache()->getCacheKey(md5($data['q']) && !isset($options['offset']))) {
            $songs = $this->cache()->getCacheKey(md5($data['q']));
        } else {
            try {
                $songs = $this->spotify->search($data['q'], 'track', $options);
                $this->cache()->setCacheData(md5($data['q']), $songs);
            }  catch(\Exception $e) {
                throw new \Exception($e);
            }
        }

        return $songs;
    }

    public function recommendSongsByGenres($data = [])
    {
        $playlists = [];
        foreach($data as $val) {
            try {
                $results = $this->spotify->getRecommendations([
                    'seed_genres' => [$val],
                    'limit' => 100,
                ]);
                $playlists[$val] = $results->tracks;
            } catch(\Exception $e) {
                continue;
            }
        }
        return $playlists;
    }
}
