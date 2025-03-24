// routes/stripe.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/create-checkout-session', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: process.env.STRIPE_PRICE_ID,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: 'https://careerpulseai.netlify.app/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://careerpulseai.netlify.app/cancel',
            metadata: {
                userId: userId,
            },
        });

        res.json({ id: session.id });
    } catch (error) {
        console.error('Error creating Stripe checkout session:', error.message);
        res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
    }
});

module.exports = router;