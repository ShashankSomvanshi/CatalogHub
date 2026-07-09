<?php

namespace App\Http\Controllers\Admin\Concerns;

use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

trait PaginatesAdminTables
{
    protected function perPage(Request $request): int
    {
        return min(100, max(1, $request->integer('per_page', 10)));
    }

    protected function searchTerms(Request $request): array
    {
        preg_match_all('/"([^"]+)"|(\S+)/', strtolower(trim((string) $request->input('search', ''))), $matches);

        return array_values(array_filter(array_map(
            static fn ($phrase, $word) => $phrase !== '' ? $phrase : $word,
            $matches[1] ?? [],
            $matches[2] ?? []
        )));
    }

    protected function paginationMeta(LengthAwarePaginator $paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
        ];
    }
}
