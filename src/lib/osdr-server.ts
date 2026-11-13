// Shared server-side OSDR search helper (used by /api/nasa/osdr and
// /api/nasa/health-context). Normalizes the documented response shape into
// stable metadata. No API key needed.
import type { NasaStudy } from '@/lib/types';

export const OSDR_API = 'https://osdr.nasa.gov/osdr/data/search';

interface OsdrHit {
  _id?: string;
  _source?: Record<string, unknown>;
}

interface OsdrResponse {
  hits?: { hits?: OsdrHit[]; total?: { value?: number } | number };
}

function str(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (Array.isArray(v) && typeof v[0] === 'string' && v[0].trim()) return v[0].trim();
  return undefined;
}

function list(v: unknown): string[] {
  if (typeof v === 'string') return v.trim() ? [v.trim()] : [];
  if (Array.isArray(v)) {
    return v
      .map((x) => {
        if (typeof x === 'string') return x.trim();
        if (x && typeof x === 'object') return str((x as Record<string, unknown>).Name);
        return undefined;
      })
      .filter((x): x is string => Boolean(x));
  }
  if (v && typeof v === 'object') {
    const name = str((v as Record<string, unknown>).Name);
    return name ? [name] : [];
  }
  return [];
}

export async function searchOsdr(term: string, from = 0, size = 12): Promise<{ results: NasaStudy[]; total: number }> {
  const url = `${OSDR_API}?term=${encodeURIComponent(term)}&from=${from}&size=${size}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!res.ok) throw new Error(`NASA OSDR responded with status ${res.status}`);
  const data = (await res.json()) as OsdrResponse;
  const hits = data.hits?.hits ?? [];

  const results: NasaStudy[] = hits.map((h) => {
    const s = h._source ?? {};
    const id = str(s.Accession) ?? str(s['Data Source Accession']) ?? str(s._id) ?? h._id ?? 'unknown';
    const title = str(s['Study Title']) ?? str(s['Project Title']) ?? str(s['Study Publication Title']) ?? 'Untitled NASA study';
    const description =
      str(s['Study Description']) ??
      str(s['Study Protocol Description']) ??
      str(s['Project Title']) ??
      'No description available in the OSDR metadata.';
    const organism = str(s.organism) ?? str(s.Characteristics);
    const topics = Array.from(
      new Set([
        ...list(s['Study Factor Name']),
        ...list(s['Study Factor Type']),
        ...list(s.Mission),
        ...list(s['Space Program']),
        ...list(s['Study Assay Technology Type']),
      ]),
    ).slice(0, 5);

    return {
      id,
      title,
      description: description.length > 460 ? `${description.slice(0, 460)}…` : description,
      topics,
      organism,
      source: `https://osdr.nasa.gov/bio/repo/data/studies/${id}`,
    };
  });

  const total = typeof data.hits?.total === 'number' ? data.hits.total : (data.hits?.total?.value ?? results.length);
  return { results, total };
}
