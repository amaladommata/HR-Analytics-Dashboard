import { GoogleAuth } from 'google-auth-library';

/**
 * Serverless proxy that reads the 4 HR source tabs live from Google Sheets
 * and returns them as JSON row arrays, so the dashboard never has to be
 * rebuilt/redeployed when the underlying sheet changes.
 *
 * Auth: a Google Cloud service account with "Viewer" access on each sheet
 * (share the sheet with the service account's email). Credentials and sheet
 * locations are read from environment variables — see README.md for setup.
 *
 * Required env vars:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY   (with literal \n for newlines)
 *   SHEET_HEADCOUNT       e.g. "1AbC...xyz#Headcount"
 *   SHEET_EXITS_YTD       e.g. "1AbC...xyz#Exits YTD"
 *   SHEET_NOTICE_PERIOD   e.g. "1AbC...xyz#Notice Period"
 *   SHEET_GLOBAL_EXITS    e.g. "1AbC...xyz#Global Exits"
 * Each value is "<spreadsheetId>#<tabName>" (tab name defaults to reading the
 * whole first sheet if omitted). All four can point at the same spreadsheet
 * (different tabs) or four different spreadsheets.
 */

interface VercelRequest {
  method?: string;
}
interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

type Row = Record<string, string>;

function parseSheetRef(envValue: string | undefined, envName: string): { spreadsheetId: string; range: string } {
  if (!envValue) throw new Error(`Missing env var ${envName}`);
  const [spreadsheetId, tab] = envValue.split('#');
  if (!spreadsheetId) throw new Error(`Invalid ${envName}: expected "<spreadsheetId>#<tabName>"`);
  return { spreadsheetId, range: tab ? `'${tab}'` : 'A1:ZZ' };
}

async function fetchSheetRows(
  auth: GoogleAuth,
  spreadsheetId: string,
  range: string,
): Promise<Row[]> {
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token.token}` } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets API ${res.status} for ${range}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { values?: unknown[][] };
  const values = data.values ?? [];
  if (values.length === 0) return [];
  const headers = values[0].map((h) => String(h ?? '').trim());
  return values.slice(1).map((row) => {
    const obj: Row = {};
    headers.forEach((h, i) => {
      const cell = row[i];
      obj[h] = cell === undefined || cell === null ? '' : formatCell(cell);
    });
    return obj;
  });
}

/** Google Sheets returns dates as serial numbers under UNFORMATTED_VALUE; convert to YYYY-MM-DD to match the CSV export format the rest of the app expects. */
function formatCell(cell: unknown): string {
  if (typeof cell === 'number' && cell > 20000 && cell < 60000) {
    // Sheets epoch: Dec 30 1899
    const ms = (cell - 25569) * 86400 * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) {
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return String(cell);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!email || !privateKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY not set');
    }

    const auth = new GoogleAuth({
      credentials: { client_email: email, private_key: privateKey },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const refs = {
      headcount: parseSheetRef(process.env.SHEET_HEADCOUNT, 'SHEET_HEADCOUNT'),
      exitsYtd: parseSheetRef(process.env.SHEET_EXITS_YTD, 'SHEET_EXITS_YTD'),
      noticePeriod: parseSheetRef(process.env.SHEET_NOTICE_PERIOD, 'SHEET_NOTICE_PERIOD'),
      globalExits: parseSheetRef(process.env.SHEET_GLOBAL_EXITS, 'SHEET_GLOBAL_EXITS'),
    };

    const [headcount, exitsYtd, noticePeriod, globalExits] = await Promise.all([
      fetchSheetRows(auth, refs.headcount.spreadsheetId, refs.headcount.range),
      fetchSheetRows(auth, refs.exitsYtd.spreadsheetId, refs.exitsYtd.range),
      fetchSheetRows(auth, refs.noticePeriod.spreadsheetId, refs.noticePeriod.range),
      fetchSheetRows(auth, refs.globalExits.spreadsheetId, refs.globalExits.range),
    ]);

    // Cache briefly at the edge so rapid page reloads don't re-hit Sheets on every request,
    // while still reflecting a sheet edit within well under a minute.
    res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=60');
    res.status(200).json({ headcount, exitsYtd, noticePeriod, globalExits });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
