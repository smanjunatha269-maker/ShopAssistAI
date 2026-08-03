import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  return res.status(200).json({
    message:
      'Thank you for your message! ShopAssist AI is not yet connected to a language model. This is a placeholder response from the serverless API. Soon you will be able to get help with returns, shipping, refunds, warranty, payments, memberships, and promotions.',
  })
}
