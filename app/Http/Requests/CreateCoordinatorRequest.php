<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateCoordinatorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // OrgAdmin middleware enforces this at route level
    }

    public function rules(): array
    {
        return [
            'full_name' => 'required|string|max:100',
            'email'     => 'required|string|email|max:100|unique:users,email',
            'password'  => 'required|string|min:8',
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'A user with this email address already exists in the system.',
        ];
    }
}
