export async function adminAction(
  table: string,
  action: 'insert' | 'update' | 'delete',
  data?: Record<string, unknown>,
  id?: string,
) {
  const response = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ table, action, data, id }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Erreur serveur (${response.status})`);
  return result.data;
}

export async function adminUpload(file: Blob, name: string, scope: 'article' | 'logo') {
  const form = new FormData();
  form.set('file', file, name);
  form.set('scope', scope);
  const response = await fetch('/api/admin/upload', { method: 'POST', body: form });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Erreur serveur (${response.status})`);
  return result as { path: string; url: string };
}
