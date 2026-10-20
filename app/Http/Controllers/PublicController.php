<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Certificate;
use App\Models\Event;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use App\Models\Organization;
use App\Models\User;
use App\Services\FileStore;
use Illuminate\Support\Facades\Cache;

class PublicController extends Controller
{
    /** G1 — organizations a new volunteer can join (active + verified). */
    public function organizations(FileStore $files)
    {
        $orgs = Organization::query()->public()->orderBy('name')->get();
        $counts = User::withoutGlobalScopes()->where('role', 'Volunteer')->whereIn('org_id', $orgs->pluck('id'))
            ->selectRaw('org_id, count(*) as c')->groupBy('org_id')->pluck('c', 'org_id');

        return response()->json([
            'status' => 'success',
            'data'   => $orgs->map(fn ($o) => [
                'id'              => $o->id,
                'name'            => $o->name,
                'logo_url'        => $files->url($o->logo_path),
                'address'         => $o->address,
                'city'            => $o->city,
                'country'         => $o->country,
                'volunteer_count' => (int) ($counts[$o->id] ?? 0),
            ])->values(),
        ]);
    }

    /** Shareable organization page (no login): profile, impact and upcoming events. */
    public function organization($id, FileStore $files)
    {
        $org = Organization::query()->public()->findOrFail($id);

        $data = Cache::remember("public_org_{$org->id}", 300, function () use ($org, $files) {
            $eventIds = Event::withoutGlobalScopes()->where('org_id', $org->id)->select('id');
            $shiftIds = Shift::whereIn('event_id', $eventIds)->select('id');

            $upcoming = Event::withoutGlobalScopes()->where('org_id', $org->id)->whereIn('status', ['upcoming', 'ongoing'])
                ->whereDate('end_date', '>=', now()->toDateString())
                ->with(['shifts' => fn ($q) => $q->where('start_time', '>', now())->orderBy('start_time')])
                ->orderBy('start_date')->limit(12)->get()
                ->map(function ($e) {
                    $next = $e->shifts->first();
                    $open = $e->shifts->sum(fn ($s) => max(0, $s->capacity - $s->confirmedCount()));
                    return [
                        'id'          => $e->id,
                        'title'       => $e->title,
                        'description' => \Illuminate\Support\Str::limit((string) $e->description, 220),
                        'location'    => $e->location,
                        'start_date'  => $e->start_date?->toDateString(),
                        'end_date'    => $e->end_date?->toDateString(),
                        'next_shift'  => $next?->start_time?->toIso8601String(),
                        'shifts'      => $e->shifts->count(),
                        'open_places' => $open,
                    ];
                })->values();

            return [
                'id'            => $org->id,
                'name'          => $org->name,
                'logo_url'      => $files->url($org->logo_path),
                'primary_color' => $org->primary_color,
                'website'       => $org->website,
                'city'          => $org->city,
                'country'       => $org->country,
                'about'         => $org->settings['about'] ?? null,
                'verified'      => $org->verification_status === 'verified',
                'member_since'  => $org->created_at->toDateString(),
                'stats'         => [
                    'active_events'  => $upcoming->count(),
                    'past_events'    => Event::withoutGlobalScopes()->where('org_id', $org->id)->where('status', 'completed')->count(),
                    'volunteers'     => ShiftAssignment::whereIn('shift_id', $shiftIds)->where('status', 'confirmed')->distinct('volunteer_id')->count('volunteer_id'),
                    'verified_hours' => round((float) Attendance::whereIn('shift_id', $shiftIds)->whereIn('hours_status', ['verified', 'adjusted'])->sum('verified_hours'), 1),
                ],
                'upcoming_events' => $upcoming,
            ];
        });

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    /** G2 — landing page counters. */
    public function stats()
    {
        $data = Cache::remember('public_stats', 600, fn () => [
            'organizations'       => Organization::query()->public()->count(),
            'volunteers'          => User::withoutGlobalScopes()->where('role', 'Volunteer')->count(),
            'verified_hours'      => round((float) Attendance::whereIn('hours_status', ['verified', 'adjusted'])->sum('verified_hours')),
            'certificates_issued' => Certificate::withoutGlobalScopes()->count(),
            'shifts_completed'    => Attendance::whereNotNull('check_out_time')->distinct('shift_id')->count('shift_id'),
        ]);

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    /** Plans for the public pricing table. */
    public function plans()
    {
        return response()->json([
            'status' => 'success',
            'data'   => collect(config('plans.plans'))->map(fn ($p, $k) => ['key' => $k] + $p)->values(),
        ]);
    }
}
