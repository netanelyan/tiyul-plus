/**
 * Server only - the request headers for every call to Anthropic.
 *
 * `ANTHROPIC_WORKSPACE_ID` exists because a user-scoped key (`sk-ant-usr-...`)
 * belongs to no workspace, and the API rejects it with a 400 unless each
 * request names one ("This API key is not scoped to a workspace..."). A normal
 * workspace key (`sk-ant-api03-...`) needs nothing, so an environment that
 * leaves the variable unset sends exactly the headers it always sent.
 */
export function anthropicHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
    'anthropic-version': '2023-06-01',
  };
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  if (workspace) headers['anthropic-workspace-id'] = workspace;
  return headers;
}
