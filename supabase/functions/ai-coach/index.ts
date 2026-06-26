import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface CoachRequest {
  prompt: string;
  userContext: Record<string, unknown>;
}

serve(async (req) => {
  try {
    const { prompt, userContext }: CoachRequest = await req.json();

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ message: deterministicResponse(prompt, userContext) }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_API_MODEL') ?? 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are GravityPath Coach. Explain deterministic training decisions. Never diagnose injuries, promise results, invent progressions, or override pain flags.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      })
    });

    const openaiData = await openaiRes.json();
    const message = openaiData.choices?.[0]?.message?.content ?? deterministicResponse(prompt, userContext);

    return new Response(JSON.stringify({ message }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});

function deterministicResponse(prompt: string, _ctx: Record<string, unknown>): string {
  if (prompt.includes('weighted pull-up')) {
    return 'Your weighted pull-up remains at the current load because the rule requires 6, 6, and 6 reps with acceptable form before increasing. Your next target is 6, 6, and 6 at the same load.';
  }
  if (prompt.includes('front lever')) {
    return 'You have not unlocked full front lever because your advanced-tuck holds reached the time target only once. The node requires the target on two of three exposures with acceptable body-line quality.';
  }
  return 'GravityPath Coach: Your next steps come from the deterministic progression engine. Keep training consistently and respect pain flags.';
}
