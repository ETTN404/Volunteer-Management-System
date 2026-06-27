<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class EventPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['SuperAdmin', 'OrgAdmin', 'Coordinator', 'Volunteer']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Event $event): bool
    {
        // Must belong to the same organization
        return $user->org_id === $event->org_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Only Coordinators and OrgAdmins can create events
        return in_array($user->role, ['OrgAdmin', 'Coordinator']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Event $event): bool
    {
        // Must belong to the same organization AND be an admin/coordinator
        return $user->org_id === $event->org_id && in_array($user->role, ['OrgAdmin', 'Coordinator']);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Event $event): bool
    {
        // Only OrgAdmins can delete events
        return $user->org_id === $event->org_id && $user->role === 'OrgAdmin';
    }
}
