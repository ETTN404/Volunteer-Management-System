<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatbotResponseResource extends JsonResource
{
    /**
     * Transform a Chatbot query/response array into its API representation.
     */
    public function toArray(Request $request): array
    {
        return [
            'status'    => 'success',
            'bot_name'  => 'VolunBot AI',
            'query'     => $this['query'] ?? '',
            'response'  => $this['response'] ?? '',
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
