<?php

namespace App\Http\Controllers;

use App\Services\FileStore;
use Illuminate\Http\Request;

class FileController extends Controller
{
    public function show(Request $request, string $id, FileStore $files)
    {
        $file = $files->find($id);
        if (!$file) {
            return response()->json(['status' => 'error', 'message' => 'File not found.'], 404);
        }
        if ($file->visibility !== 'public' && !$request->hasValidSignature()) {
            return response()->json(['status' => 'error', 'message' => 'This link has expired. Reopen the page to get a new one.'], 403);
        }

        $safeName = preg_replace('/[^A-Za-z0-9._-]/', '_', $file->name ?? 'file');

        return response(base64_decode($file->content), 200, [
            'Content-Type'           => $file->mime_type,
            'Content-Length'         => $file->size_bytes,
            'Content-Disposition'    => 'inline; filename="' . $safeName . '"',
            'Cache-Control'          => $file->visibility === 'public' ? 'public, max-age=86400' : 'private, max-age=300',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
