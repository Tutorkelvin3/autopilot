export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body;

  const systemPrompt = `You are AutoPilot, an autonomous DeFi agent on Sui blockchain.
Decide the single best action for this cycle. Reply with ONLY valid JSON, no markdown:
{"action":"HOLD","reasoning":"your reasoning here","params":{"protocol":null,"asset":null,"amount":null},"confidence":7,"urgency":"low"}
Valid actions: HOLD, TRADE, DEPOSIT_YIELD, WITHDRAW_YIELD, REBALANCE`;

  const userMessage = `Strategy: ${body.strategy?.type || 'balanced'} | Risk: ${body.strategy?.risk || 'medium'} | Target APY: ${body.strategy?.targetAPY || 15}%
SUI Price: $${(body.marketData?.suiPrice || 0).toFixed(4)} | 24h Change: ${(body.marketData?.suiChange24h || 0).toFixed(2)}%
Scallop SUI APY: ${(body.yieldRates?.scallopSUI || 0).toFixed(2)}% | Scallop USDC APY: ${(body.yieldRates?.scallopUSDC || 0).toFixed(2)}%
SUI Balance: ${(body.currentBalance?.suiTokens || 0).toFixed(4)} SUI
Recent: ${(body.recentTrades || []).slice(0,2).map(t => t.action).join(', ') || 'none'}
Decide now. JSON only.`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.2,
        max_tokens: 200,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return res.status(502).json({
        error: err,
        decision: { action: 'HOLD', reasoning: 'AI unavailable — holding.', params: {}, confidence: 0 }
      });
    }

    const data = await groqRes.json();
    const raw  = data.choices?.[0]?.message?.content || '{}';

    let decision;
    try {
      decision = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
    } catch {
      decision = { action: 'HOLD', reasoning: 'Parse error — holding.', params: {}, confidence: 0 };
    }

    const valid = ['HOLD','TRADE','DEPOSIT_YIELD','WITHDRAW_YIELD','REBALANCE'];
    if (!valid.includes(decision.action)) decision.action = 'HOLD';

    return res.status(200).json({ decision });

  } catch (err) {
    return res.status(500).json({
      error: err.message,
      decision: { action: 'HOLD', reasoning: 'Server error — holding.', params: {}, confidence: 0 }
    });
  }
}