import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { createServiceClient, jsonResponse, requireRole } from '../_shared/supabase.ts';

async function buildPdf(title: string, lines: string[]) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 800;
  page.drawText(title, { x: 40, y, size: 20, font: fontBold, color: rgb(0.08, 0.09, 0.1) });
  y -= 28;
  for (const line of lines) {
    const chunks = line.split(/\n/);
    for (const chunk of chunks) {
      page.drawText(chunk.slice(0, 110), { x: 40, y, size: 10.5, font, color: rgb(0.18, 0.18, 0.2) });
      y -= 14;
      if (y < 60) { y = 800; pdf.addPage([595, 842]); }
    }
    y -= 4;
  }
  return pdf.save();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true });
  const auth = await requireRole(req, ['admin', 'delivery']);
  if ('error' in auth) return auth.error;

  try {
    const { client_id, cycle_id } = await req.json();
    if (!client_id) return jsonResponse({ success: false, error: 'client_id is required' }, 400);

    const supabase = createServiceClient();
    const { data: scripts } = await supabase.from('scripts').select('*').eq('client_id', client_id).eq('status', 'active').order('psychological_alignment_score', { ascending: false });
    const pdfBytes = await buildPdf('AA Studio Script Pack', (scripts ?? []).map((script, index) => `${index + 1}. ${script.hook_text}\n${script.body_text ?? ''}\nCTA: ${script.cta_text ?? ''}`));

    const path = `${client_id}/script-pack-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage.from('exports').upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw uploadError;

    const { data: signed } = await supabase.storage.from('exports').createSignedUrl(path, 60 * 60 * 24);
    await supabase.from('script_pack_exports').insert({ client_id, cycle_id: cycle_id ?? null, export_url: signed?.signedUrl ?? null });

    return jsonResponse({ success: true, url: signed?.signedUrl ?? null });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
