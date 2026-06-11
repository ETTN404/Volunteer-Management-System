<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Organization extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'address',
        'status',
    ];

    /**
     * Get the users that belong to the organization.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'org_id');
    }

    /**
     * Get the events hosted by the organization.
     */
    public function events(): HasMany
    {
        return $this->hasMany(Event::class, 'org_id');
    }

    /**
     * Get the certificates issued by the organization.
     */
    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class, 'org_id');
    }

    /**
     * Get the reports generated for the organization.
     */
    public function reports(): HasMany
    {
        return $this->hasMany(Report::class, 'org_id');
    }

    /**
     * Get the announcements posted for the organization.
     */
    public function announcements(): HasMany
    {
        return $this->hasMany(Announcement::class, 'org_id');
    }
}
