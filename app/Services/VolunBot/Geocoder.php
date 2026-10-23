<?php

namespace App\Services\VolunBot;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/** Turns "I'm in Bole" into coordinates via OpenStreetMap Nominatim (Ethiopia first). */
class Geocoder
{
    /** @return array{lat: float, lng: float, label: string}|null */
    public function find(string $place): ?array
    {
        $place = trim(mb_substr($place, 0, 120));
        if ($place === '') {
            return null;
        }

        return Cache::remember('geocode.' . md5(mb_strtolower($place)), now()->addDays(30), function () use ($place) {
            foreach (['et', null] as $country) {
                try {
                    $res = Http::withHeaders(['User-Agent' => 'VolunTrack/1.0 (volunteer assistant)'])
                        ->timeout(6)
                        ->get('https://nominatim.openstreetmap.org/search', array_filter([
                            'q' => $place, 'format' => 'jsonv2', 'limit' => 1, 'countrycodes' => $country, 'accept-language' => 'en',
                        ]));
                } catch (\Throwable) {
                    return null;
                }
                $hit = $res->successful() ? ($res->json()[0] ?? null) : null;
                if ($hit) {
                    $label = implode(', ', array_slice(explode(', ', (string) $hit['display_name']), 0, 3));
                    return ['lat' => (float) $hit['lat'], 'lng' => (float) $hit['lon'], 'label' => $label];
                }
            }
            return null;
        });
    }
}
