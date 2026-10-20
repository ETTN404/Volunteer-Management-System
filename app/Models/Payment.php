<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'org_id', 'plan', 'months', 'amount', 'currency', 'method', 'transaction_ref', 'payer_name', 'payer_account_suffix', 'status',
        'verification_source', 'verification_response', 'submitted_by', 'reviewed_by', 'reviewed_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount'                => 'decimal:2',
            'months'                => 'integer',
            'verification_response' => 'array',
            'reviewed_at'           => 'datetime',
        ];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'org_id');
    }

    public function submitter()
    {
        return $this->belongsTo(User::class, 'submitted_by')->withoutGlobalScopes();
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by')->withoutGlobalScopes();
    }
}
