<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Course extends Model
{
    protected $fillable = [
        'name',
        'code',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get active courses formatted for Select2 dropdowns and operational forms.
     * Combines active records from `courses` table and any legacy `stream_details`.
     *
     * @return \Illuminate\Support\Collection<int, array{id: string, text: string, stream: string}>
     */
    public static function getActiveStreamOptions(): \Illuminate\Support\Collection
    {
        $activeCourses = static::where('is_active', true)->orderBy('name', 'asc')->get();

        $seen = [];
        $options = collect();

        foreach ($activeCourses as $c) {
            $name = trim((string) $c->name);
            if ($name === '' || isset($seen[$name])) {
                continue;
            }
            $seen[$name] = true;
            $options->push([
                'id' => $name,
                'text' => $name,
                'stream' => $c->code ?: $name,
            ]);
        }

        // Also include any distinct Division from stream_details not already present
        $streams = StreamDetail::whereNotNull('Division')
            ->where('Division', '!=', '')
            ->orderBy('Division', 'asc')
            ->get();

        foreach ($streams as $s) {
            $name = trim((string) $s->Division);
            if ($name === '' || isset($seen[$name])) {
                continue;
            }
            $seen[$name] = true;
            $options->push([
                'id' => $name,
                'text' => $name,
                'stream' => $s->Name ?: $name,
            ]);
        }

        return $options->sortBy('text', SORT_NATURAL | SORT_FLAG_CASE)->values();
    }

    /**
     * Get list of active course names.
     *
     * @return array<int, string>
     */
    public static function getActiveCourseNames(): array
    {
        return static::getActiveStreamOptions()->pluck('text')->toArray();
    }
}
