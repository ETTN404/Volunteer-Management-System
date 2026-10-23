<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class VolunBotTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Shift $mine;
    private Shift $open;

    protected function setUp(): void
    {
        parent::setUp();
        $org = Organization::create(['name' => 'Mekedonia', 'email' => 'm@example.org', 'status' => 'active', 'verification_status' => 'verified']);
        $event = Event::create([
            'org_id' => $org->id, 'title' => 'Meal Day', 'location' => 'Piassa', 'latitude' => 9.0350, 'longitude' => 38.7510,
            'start_date' => now()->toDateString(), 'end_date' => now()->addDays(10)->toDateString(), 'status' => 'upcoming',
        ]);
        $other = Event::create([
            'org_id' => $org->id, 'title' => 'Clinic Support', 'location' => 'Bole', 'latitude' => 8.9950, 'longitude' => 38.7870,
            'start_date' => now()->toDateString(), 'end_date' => now()->addDays(10)->toDateString(), 'status' => 'upcoming',
        ]);
        $this->mine = Shift::create(['event_id' => $event->id, 'title' => 'Serving', 'start_time' => now()->addDay(), 'end_time' => now()->addDay()->addHours(3), 'capacity' => 5, 'qr_secret' => str_repeat('a', 64), 'required_skills' => []]);
        $this->open = Shift::create(['event_id' => $other->id, 'title' => 'Triage', 'start_time' => now()->addDays(3), 'end_time' => now()->addDays(3)->addHours(4), 'capacity' => 2, 'qr_secret' => str_repeat('b', 64), 'required_skills' => ['first_aid']]);

        $this->user = User::create(['org_id' => null, 'first_name' => 'Hana', 'last_name' => 'Tesfaye', 'email' => 'hana@ex.com', 'password' => Hash::make('password'), 'role' => 'Volunteer']);
        $v = Volunteer::create(['user_id' => $this->user->id, 'skills' => ['first_aid'], 'availability' => ['saturdays'], 'total_hours' => 8, 'impact_score' => 1.2]);
        ShiftAssignment::create(['shift_id' => $this->mine->id, 'volunteer_id' => $v->id, 'status' => 'confirmed']);
    }

    public function test_context_is_live_and_cards_come_back_for_the_shifts_the_model_names(): void
    {
        config(['services.gemini.key' => 'test-key', 'services.gemini.model' => 'gemini-flash-latest']);
        $seen = null;
        Http::fake(function (HttpRequest $req) use (&$seen) {
            $seen = $req->data();
            return Http::response(['candidates' => [['content' => ['parts' => [['text' => json_encode([
                'reply' => 'Your next shift is **Meal Day**.', 'shift_ids' => [$this->mine->id, 999999],
                'follow_ups' => ['How far is it?'], 'ask_location' => false, 'place_query' => '',
            ])]]]]]]);
        });

        $res = $this->actingAs($this->user, 'sanctum')->postJson('/api/volunteer/chat', ['message' => 'When is my next shift?', 'latitude' => 9.03, 'longitude' => 38.75, 'location_source' => 'gps'])
            ->assertOk()
            ->assertJsonPath('data.response', 'Your next shift is **Meal Day**.')
            ->assertJsonPath('data.degraded', false)
            ->assertJsonCount(1, 'data.cards')
            ->assertJsonPath('data.cards.0.shift_id', $this->mine->id)
            ->assertJsonPath('data.follow_ups.0', 'How far is it?');

        $this->assertNotNull($res->json('data.cards.0.distance_km'));
        $system = $seen['systemInstruction']['parts'][0]['text'];
        $this->assertStringContainsString('Hana Tesfaye', $system);
        $this->assertStringContainsString('Clinic Support', $system); // open opportunity, ranked
        $this->assertStringContainsString('distance_from_me', $system);

        // Something changes mid-chat → the next message sees it.
        $this->mine->update(['title' => 'Packing']);
        $this->actingAs($this->user, 'sanctum')->postJson('/api/volunteer/chat', ['message' => 'And now?'])->assertOk();
        $this->assertStringContainsString('Packing', $seen['systemInstruction']['parts'][0]['text']);
        $this->assertStringContainsString('phone GPS', $seen['systemInstruction']['parts'][0]['text']); // location remembered

        $this->actingAs($this->user, 'sanctum')->getJson('/api/volunteer/chat/history')
            ->assertOk()->assertJsonCount(4, 'data')->assertJsonPath('data.1.cards.0.shift_id', $this->mine->id);
    }

    public function test_retired_model_falls_through_to_a_current_one(): void
    {
        config(['services.gemini.key' => 'test-key', 'services.gemini.model' => 'gemini-1.5-flash']);
        Http::fake([
            '*gemini-1.5-flash:*' => Http::response(['error' => ['message' => 'models/gemini-1.5-flash is not found']], 404),
            '*' => Http::response(['candidates' => [['content' => ['parts' => [['text' => '{"reply":"Hi Hana","shift_ids":[],"follow_ups":[],"ask_location":false,"place_query":""}']]]]]]),
        ]);

        $this->actingAs($this->user, 'sanctum')->postJson('/api/volunteer/chat', ['message' => 'hello'])
            ->assertOk()->assertJsonPath('data.response', 'Hi Hana')->assertJsonPath('data.degraded', false);
    }

    public function test_without_ai_it_answers_from_real_data_only(): void
    {
        config(['services.gemini.key' => null]);

        $this->actingAs($this->user, 'sanctum')->postJson('/api/volunteer/chat', ['message' => 'When is my next shift?'])
            ->assertOk()
            ->assertJsonPath('data.degraded', true)
            ->assertJsonPath('data.cards.0.shift_id', $this->mine->id)
            ->assertSee('Meal Day');

        $this->actingAs($this->user, 'sanctum')->postJson('/api/volunteer/chat', ['message' => 'How far is the clinic from me?'])
            ->assertOk()->assertJsonPath('data.ask_location', true);
    }
}
