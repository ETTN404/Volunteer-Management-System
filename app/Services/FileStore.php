<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/**
 * Database-backed file storage (photos, logos, documents).
 *
 * Paths are stored on models as "db:{uuid}". Public files (avatars, logos) are
 * served at /api/files/{uuid}; private files (IDs, consent forms, registration
 * papers) only through short-lived signed URLs handed to authorized viewers.
 */
class FileStore
{
    public const PREFIX = 'db:';

    public function put(UploadedFile $file, string $visibility = 'private'): string
    {
        $id = (string) Str::uuid();
        DB::table('stored_files')->insert([
            'id'          => $id,
            'visibility'  => $visibility,
            'name'        => mb_substr($file->getClientOriginalName(), 0, 200),
            'mime_type'   => $file->getMimeType() ?: 'application/octet-stream',
            'size_bytes'  => $file->getSize(),
            'content'     => base64_encode(file_get_contents($file->getRealPath())),
            'uploaded_by' => auth()->id(),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
        return self::PREFIX . $id;
    }

    public function delete(?string $path): void
    {
        if ($path && str_starts_with($path, self::PREFIX)) {
            DB::table('stored_files')->where('id', substr($path, strlen(self::PREFIX)))->delete();
        }
    }

    /** URL for a stored path: public files get a stable URL, private files a signed one. */
    public function url(?string $path, int $minutes = 30): ?string
    {
        if (!$path) {
            return null;
        }
        if (!str_starts_with($path, self::PREFIX)) {
            return asset('storage/' . ltrim(str_replace('storage/', '', $path), '/'));
        }
        $id  = substr($path, strlen(self::PREFIX));
        $vis = DB::table('stored_files')->where('id', $id)->value('visibility');
        if ($vis === 'public') {
            return route('files.show', ['id' => $id]);
        }
        return URL::temporarySignedRoute('files.show', now()->addMinutes($minutes), ['id' => $id]);
    }

    public function find(string $id): ?object
    {
        return DB::table('stored_files')->where('id', $id)->first();
    }
}
