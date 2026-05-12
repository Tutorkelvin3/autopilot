require('dotenv').config();
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', model: 'llama-3.3-70b-versatile', timestamp: new Date().toISOString() });
});

app.post('/api/agent/think', async (req, res) => {
  const body = req.body;

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      error: 'GROQ_API_KEY not set in backend/.env',
      decision: { action: 'HOLD', reasoning: 'API key missing.', params: {}, confidence: 0 },
    });
  }

  const systemPrompt = `You are AutoPilot, an autonomous DeFi agent on Sui blockchain.
Decide the single best action for this cycle. You MUST reply with ONLY a valid JSON object.
No markdown. No explanation. No code blocks. Just raw JSON like this example:
{"action":"DEPOSIT_YIELD","reasoning":"Scallop APY at 8.2% exceeds the 15% target threshold so depositing idle SUI to earn yield.","params":{"protocol":"Scallop","asset":"SUI","amount":null},"confidence":8,"urgency":"medium"}

Valid actions: HOLD, TRADE, DEPOSIT_YIELD, WITHDRAW_YIELD, REBALANCE`;

  const userMessage = `Strategy: ${body.strategy?.type || 'balanced'} | Risk: ${body.strategy?.risk || 'medium'} | Target APY: ${body.strategy?.targetAPY || 15}%
SUI Price: $${(body.marketData?.suiPrice || 0).toFixed(4)} | 24h Change: ${(body.marketData?.suiChange24h || 0).toFixed(2)}%
Scallop SUI APY: ${(body.yieldRates?.scallopSUI || 0).toFixed(2)}% | Scallop USDC APY: ${(body.yieldRates?.scallopUSDC || 0).toFixed(2)}%
SUI Balance: ${(body.currentBalance?.suiTokens || 0).toFixed(4)} SUI
Recent: ${(body.recentTrades || []).slice(0,2).map(t => `${t.action}`).join(', ') || 'none'}
Decide now. Reply with JSON only.`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage  },
        ],
        temperature:  0.2,
        max_tokens:   200,
        stream:       false,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[Groq] API error:', errText);
      return res.status(502).json({
        error: errText,
        decision: { action: 'HOLD', reasoning: 'AI unavailable — holding positions.', params: {}, confidence: 0 },
      });
    }

    const groqData = await groqRes.json();
    const rawText  = groqData.choices?.[0]?.message?.content || '{}';

    console.log('[Groq] Raw:', rawText);

    let decision;
    try {
      const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim();
      decision = JSON.parse(cleaned);
    } catch {
      decision = { action: 'HOLD', reasoning: 'Parse error — holding.', params: {}, confidence: 0, urgency: 'low' };
    }

    const valid = ['HOLD','TRADE','DEPOSIT_YIELD','WITHDRAW_YIELD','REBALANCE'];
    if (!valid.includes(decision.action)) decision.action = 'HOLD';

    console.log(`[AutoPilot] ✅ Decision: ${decision.action} — ${decision.reasoning}`);
    return res.json({ decision, rawResponse: rawText });

  } catch (err) {
    console.error('[Backend] Error:', err.message);
    return res.status(500).json({
      error: err.message,
      decision: { action: 'HOLD', reasoning: 'Server error — holding.', params: {}, confidence: 0 },
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🤖 AutoPilot Backend (Groq/Llama3) running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});