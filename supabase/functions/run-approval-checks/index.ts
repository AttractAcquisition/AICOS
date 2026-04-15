Deno.serve(() => {
  return new Response(
    JSON.stringify({ error: 'AA Studio function stub, implement next' }),
    {
      status: 501,
      headers: { 'content-type': 'application/json' },
    },
  );
});
