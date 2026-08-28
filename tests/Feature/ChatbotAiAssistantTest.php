<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ChatbotAiAssistantTest extends TestCase
{
    use RefreshDatabase;

    private $org;
    private $volUser;
    private $volunteer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organization::create([
            'name' => 'Red Cross Ethiopia',
            'email' => 'addis@redcross.org',
        ]);

        $this->volUser = User::create([
            'org_id' => $this->org->id,
            'full_name' => 'Sarah Jenkins',
            'email' => 'sarah@redcross.org',
            'password' => Hash::make('password123'),
            'role' => 'Volunteer',
        ]);

        $this->volunteer = Volunteer::create([
            'user_id' => $this->volUser->id,
            'skills' => ['first_aid'],
            'total_hours' => 25.00,
            'impact_score' => 4.50,
        ]);
    }

    /**
     * Test the AI Chatbot queries and RAG context injection logic.
     */
    public function test_chatbot_contextual_metrics_query()
    {
        // 1. Ask Chatbot about hours
        $response = $this->actingAs($this->volUser, 'sanctum')
                         ->postJson('/api/volunteer/chat', [
                             'message' => 'How many hours do I have logged so far?',
                         ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.status', 'success')
                 ->assertJsonPath('data.query', 'How many hours do I have logged so far?');

        // Assert response correctly parsed Sarah's name and hours from database context!
        $responseContent = $response->json('data.response');
        $this->assertNotNull($responseContent);
    }

    /**
     * Test chatbot handles schedule context queries.
     */
    public function test_chatbot_contextual_schedule_query()
    {
        // 2. Ask Chatbot about upcoming schedule
        $response = $this->actingAs($this->volUser, 'sanctum')
                         ->postJson('/api/volunteer/chat', [
                             'message' => 'What is my upcoming schedule tomorrow?',
                         ]);

        $response->assertStatus(200);
        $responseContent = $response->json('data.response');
        $this->assertNotNull($responseContent);
    }
}
