<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Organization extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUSES = ['active', 'suspended', 'inactive'];

    protected $fillable = [
        'name',
        'email',
        'address',
        'country',
        'city',
        'phone',
        'logo_path',
        'primary_color',
        'subdomain',
        'website',
        'subscription_plan',
        'plan_expires_at',
        'status',
        'verification_status',
        'verified_at',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'settings'        => 'array',
            'verified_at'     => 'datetime',
            'plan_expires_at' => 'datetime',
        ];
    }

    /** Active and verified: visible to volunteers and able to take applications. */
    public function isPublic(): bool
    {
        return $this->status === 'active' && ($this->verification_status ?? 'verified') === 'verified';
    }

    public function scopePublic($query)
    {
        return $query->where('organizations.status', 'active')->where('organizations.verification_status', 'verified');
    }

    /** Plan in force today (an expired paid plan falls back to the default). */
    public function effectivePlan(): string
    {
        $default = config('plans.default', 'free');
        $plan    = $this->subscription_plan ?: $default;
        if ($plan !== $default && $this->plan_expires_at && $this->plan_expires_at->isPast()) {
            return $default;
        }
        return array_key_exists($plan, config('plans.plans', [])) ? $plan : $default;
    }

    /** Attendance policy = platform defaults overridden by the organization's own settings. */
    public function attendancePolicy(): array
    {
        $defaults = config('vms.attendance', []);
        $own      = $this->settings['attendance'] ?? [];
        return array_merge($defaults, array_intersect_key($own, $defaults));
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'org_id')->withoutGlobalScope(Scopes\TenantScope::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class, 'org_id')->withoutGlobalScope(Scopes\TenantScope::class);
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class, 'org_id');
    }

    public function reports(): HasMany
    {
        return $this->hasMany(Report::class, 'org_id');
    }

    public function announcements(): HasMany
    {
        return $this->hasMany(Announcement::class, 'org_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(OrganizationDocument::class, 'org_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'org_id');
    }
}
