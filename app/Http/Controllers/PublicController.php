<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Certificate;
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
