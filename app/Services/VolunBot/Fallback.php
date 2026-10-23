<?php

namespace App\Services\VolunBot;

/**
 * Answers from the live context without an AI model — used when Gemini is not
 * configured or unreachable. Only states facts that are in the context.
 */
class Fallback
{
    public function answer(string $message, array $ctx): array
    {
        $am = (bool) preg_match('/\p{Ethiopic}/u', $message);
        $m = mb_strtolower($message);
        $first = $ctx['me']['first_name'] ?? '';
        $up = $ctx['my_upcoming_shifts'] ?? [];
        $ops = $ctx['open_opportunities'] ?? [];
        $impact = $ctx['impact'];
        $hasLoc = is_array($ctx['my_location'] ?? null);

        $is = fn (string $re) => (bool) preg_match($re, $m);

        if ($is('/far|distance|km|near|close to me|ርቀት|ቅርብ|ምን ያህል ይርቃል/u')) {
            if (!$hasLoc) {
                return $this->out($am ? 'ርቀቱን ለማስላት አካባቢዎን ማወቅ አለብኝ። ከታች "አካባቢዬን አጋራ" የሚለውን ይጫኑ ወይም የሚገኙበትን ሰፈር ይንገሩኝ።' : 'To work out distances I need to know where you are. Tap **Share my location** below, or tell me your area.', [], [], true);
            }
            $near = collect($ops)->filter(fn ($o) => isset($o['distance_from_me']))->take(3);
            $lines = $near->map(fn ($o) => "• **{$o['event']}** — {$o['distance_from_me']} ({$o['travel_estimate']})")->implode("\n");
            return $this->out(($am ? "ከእርስዎ አቅራቢያ ያሉ ዕድሎች፦\n" : "Closest open shifts to you:\n") . ($lines ?: ($am ? 'ቦታቸው በካርታ ላይ የተመዘገበ ዕድል አላገኘሁም።' : 'None of the open shifts have a map pin yet.')), $near->pluck('shift_id')->all());
        }

        if ($is('/next|upcoming|schedule|when|my shift|ቀጣይ|ፕሮግራም|መቼ|ሺፍት/u')) {
            if (!$up) {
                return $this->out($am ? 'አሁን የተያዘ ሺፍት የለዎትም። ለእርስዎ የሚስማሙ ዕድሎች እነሆ፦' : "You don't have any shifts coming up. Here are a few that suit you:", array_column(array_slice($ops, 0, 3), 'shift_id'));
            }
            $n = $up[0];
            $text = $am
                ? "ቀጣዩ ሺፍትዎ **{$n['event']}** ነው — {$n['when']} ({$n['starts_in']})፣ {$n['venue']}። ሁኔታ፦ {$n['my_status']}። ቼክ-ኢን፦ {$n['check_in']}።"
                : "Your next shift is **{$n['event']}** — {$n['when']} ({$n['starts_in']}) at {$n['venue']}. Status: {$n['my_status']}. Check-in {$n['check_in']}." . (count($up) > 1 ? ' You have ' . (count($up) - 1) . ' more after that.' : '');
            return $this->out($text, array_column(array_slice($up, 0, 3), 'shift_id'));
        }

        if ($is('/hour|certific|milestone|ሰዓት|ሰርተፊኬት/u')) {
            $to = $impact['hours_to_next_certificate'];
            return $this->out($am
                ? "እስካሁን **{$impact['verified_hours']} የተረጋገጡ ሰዓቶች** አሉዎት" . ($to > 0 ? "፤ የሚቀጥለው ሰርተፊኬት በ{$impact['next_certificate_at']} ነው — {$to} ሰዓት ይቀርዎታል።" : '።')
                : "You have **{$impact['verified_hours']} verified hours**" . ($impact['hours_waiting_approval'] > 0 ? " (+{$impact['hours_waiting_approval']} waiting for approval)" : '') . ($to > 0 ? ". Your next certificate unlocks at **{$impact['next_certificate_at']}** — {$to} hours to go." : '. You have earned every milestone certificate.'));
        }

        if ($is('/impact|score|ውጤት|ተጽዕኖ/u')) {
            return $this->out($am
                ? "የተጽዕኖ ውጤትዎ **{$impact['impact_score']}** ነው። በእያንዳንዱ የተረጋገጠ ሰዓት 0.1 ነጥብ ያገኛሉ፤ በሰዓቱ ቼክ-ኢን ሲያደርጉ +15% ይጨምራል።"
                : "Your impact score is **{$impact['impact_score']}**. Each verified hour earns 0.1 points, with bonuses: +20% for shifts needing 3+ skills, +15% for checking in on time, +10% while your attendance stays at 90%+.");
        }

        if ($is('/recommend|suggest|best|opportunit|match|find|ምርጥ|ዕድል|ጠቁመኝ|አግኝልኝ/u')) {
            $top = array_slice($ops, 0, 3);
            if (!$top) {
                return $this->out($am ? 'አሁን ክፍት ዕድሎች የሉም። በቅርቡ ደግመው ይመልከቱ።' : 'There are no open shifts right now. New ones appear often — check back soon.');
            }
            $lines = collect($top)->map(fn ($o) => "• **{$o['event']}** — {$o['when']}: " . implode(', ', $o['why_it_fits']))->implode("\n");
            return $this->out(($am ? "ለእርስዎ የሚስማሙ ዕድሎች፦\n" : "Best matches for you right now:\n") . $lines, array_column($top, 'shift_id'), [], !$hasLoc);
        }

        if ($is('/check.?in|qr|gps|ቼክ/u')) {
            return $this->out($am
                ? 'ቼክ-ኢን ሺፍቱ ከመጀመሩ 15 ደቂቃ በፊት ይከፈታል፣ ከጀመረ 30 ደቂቃ በኋላ ይዘጋል። በቦታው ክልል ውስጥ ሆነው የአስተባባሪውን QR ኮድ ይቃኙ።'
                : "Check-in opens 15 minutes before your shift and closes 30 minutes after it starts. Allow location access, stand inside the venue's check-in radius and scan the QR code your coordinator shows.");
        }

        if ($is('/document|ሰነድ/u')) {
            $docs = $ctx['my_documents'] ?? [];
            $list = collect($docs)->map(fn ($d) => "• {$d['title']} — {$d['status']}")->implode("\n");
            return $this->out($list ? ($am ? "ሰነዶችዎ፦\n" : "Your documents:\n") . $list : ($am ? 'እስካሁን ሰነድ አልሰቀሉም።' : "You haven't uploaded any documents yet."));
        }

        if ($is('/skill|profile|about me|who am i|ክህሎት|መገለጫ/u')) {
            $skills = collect($ctx['me']['skills'] ?? [])->pluck('skill')->implode(', ') ?: '—';
            return $this->out($am ? "ክህሎቶችዎ፦ {$skills}። መገለጫ፦ {$ctx['me']['profile_complete']}።" : "Your skills: **{$skills}**. Profile: {$ctx['me']['profile_complete']}.");
        }

        return $this->out($am
            ? "ሰላም {$first}! ስለ ሺፍቶችዎ፣ ሰዓቶችዎ፣ ሰርተፊኬቶችዎ እና ለእርስዎ የሚስማሙ ዕድሎች መርዳት እችላለሁ።"
            : "Hi {$first}! I can help with your shifts, hours, certificates, documents and finding opportunities that suit you. What would you like to know?");
    }

    private function out(string $reply, array $ids = [], array $follow = [], bool $askLocation = false): array
    {
        return ['reply' => $reply, 'shift_ids' => $ids, 'follow_ups' => $follow, 'ask_location' => $askLocation, 'place_query' => ''];
    }
}
