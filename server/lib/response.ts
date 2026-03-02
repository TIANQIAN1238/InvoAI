// CORS preflight 处理
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };
}

export function corsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders() });
}

export function error(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: corsHeaders() });
}
