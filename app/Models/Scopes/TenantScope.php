<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class TenantScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        if (Auth::hasUser()) {
            $user = Auth::user();
            // If the user belongs to an organization (not a SuperAdmin), scope by org_id
            if ($user && $user->org_id !== null) {
                $builder->where($model->getTable() . '.org_id', $user->org_id);
            }
        }
    }
}
