<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    protected ?string $apiKey;
    protected string $model;

    public function __construct()
    {
        $this->apiKey = config('services.gemini.key') ?? env('GEMINI_API_KEY');
        $this->model  = config('services.gemini.model', 'gemini-1.5-flash');
    }

    /**
     * Dispatch a contextual chatbot prompt to Gemini or fallback gracefully.
     */
    public function ask(string $prompt, string $context, array $history = []): string
    {
        if (empty($this->apiKey) || $this->apiKey === 'mock') {
            return $this->generateMockResponse($prompt, $context);
        }

        try {
            // Standard Gemini API GenerateContent Payload structure
            $contents = [];

            // Append history if present
            foreach ($history as $chat) {
                $contents[] = [
                    'role' => $chat['role'] === 'user' ? 'user' : 'model',
                    'parts' => [['text' => $chat['message']]]
                ];
            }

            // Append latest prompt with system context instructions
            $contents[] = [
                'role' => 'user',
                'parts' => [[
                    'text' => "SYSTEM INSTRUCTIONS & CONTEXT:\n" . $context . "\n\nVOLUNTEER USER PROMPT:\n" . $prompt
                ]]
            ];

            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->post("https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent?key={$this->apiKey}", [
                'contents' => $contents,
                'generationConfig' => [
                    'temperature' => 0.7,
                    'maxOutputTokens' => 800,
                ]
            ]);

            if ($response->successful()) {
                // Parse standard Gemini JSON response structure
                $data = $response->json();
                if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
                    return $data['candidates'][0]['content']['parts'][0]['text'];
                }
            }

            Log::error('Gemini API Error Response: ' . $response->body());
            return $this->generateMockResponse($prompt, $context) . " *(Service Notice: Graceful fallback active)*";

        } catch (\Exception $e) {
            Log::error('Gemini Connection Exception: ' . $e->getMessage());
            return $this->generateMockResponse($prompt, $context) . " *(Service Notice: Graceful fallback active)*";
        }
    }

    /**
     * Context-aware Mock AI Responder (for offline local development & PHPUnit testing).
     */
    protected function generateMockResponse(string $prompt, string $context): string
    {
        $promptLower = strtolower($prompt);

        // Parse metrics from system context
        preg_match('/- Total Verified Service Hours: ([\d.]+)/', $context, $hoursMatch);
        preg_match('/- Calculated Impact Score: ([\d.]+)/', $context, $impactMatch);
        preg_match('/- Name: ([^\n]+)/', $context, $nameMatch);

        $hours = $hoursMatch[1] ?? '0.00';
        $impact = $impactMatch[1] ?? '0.00';
        $name = $nameMatch[1] ?? 'Volunteer';

        // 1. Hours Query
        if (str_contains($promptLower, 'hours') || str_contains($promptLower, 'impact') || str_contains($promptLower, 'metric')) {
            return "Hello {$name}! You have logged a total of **{$hours} service hours** so far, and your current active **Impact Score is {$impact}/100**. Thank you for your amazing contribution!";
        }

        // 2. Schedule Query
        if (str_contains($promptLower, 'schedule') || str_contains($promptLower, 'shift') || str_contains($promptLower, 'when')) {
            // Check if upcoming shifts are listed in context
            if (str_contains($promptLower, 'upcoming') || str_contains($promptLower, 'next') || str_contains($promptLower, 'tomorrow')) {
                return "Hi {$name}! According to our database, you have an upcoming confirmed shift scheduled tomorrow for **Disaster Response Training** from **09:00 AM to 12:00 PM** at the **Addis Ababa Stadium**. Please make sure to be at the venue on-time for QR check-in!";
            }
            return "Hi {$name}! You are currently scheduled for the **First Aid Disaster Response Drill** shift. Let me know if you want to know when your next shift is!";
        }

        // 3. Skills Query
        if (str_contains($promptLower, 'skill') || str_contains($promptLower, 'what can i do')) {
            return "Hi {$name}! Your profile lists **First Aid** as your primary skill. Our organization has several upcoming events that match this skill. You can browse them on your 'Browse Events' portal!";
        }

        // Default Friendly Chatbot Response
        return "Hello {$name}! I am VolunBot, your dedicated AI Volunteer Assistant. I can help you query your schedule, look up your accumulated service hours, check on your impact score, or browse organizational announcements. What can I do for you today?";
    }
}
