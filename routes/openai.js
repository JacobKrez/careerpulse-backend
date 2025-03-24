// routes/openai.js
const express = require('express');
const OpenAI = require('openai');
const router = express.Router();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let retryCount = 0;
    let delay = initialDelay;

    while (retryCount < maxRetries) {
        try {
            return await fn();
        } catch (error) {
            if (error.response && error.response.status === 429) {
                console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                retryCount++;
                delay *= 2;
            } else {
                throw error;
            }
        }
    }
    throw new Error('Max retries reached');
}

router.get('/email', async (req, res) => {
    try {
        const { job, skills, company, experience } = req.query;
        if (!job || !skills) {
            return res.status(400).json({ error: 'Job title and skills are required' });
        }
        const prompt = `Write a concise, professional outreach email for a ${job} position at ${company || 'a company'}, highlighting skills: ${skills}, and mentioning ${experience || 'several'} years of experience.`;

        const response = await retryWithBackoff(async () => {
            return await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 150,
            });
        });

        const emailContent = response.choices[0].message.content;
        res.send(emailContent);
    } catch (error) {
        console.error('Email generation error:', error.message);
        res.status(500).json({ error: 'Failed to generate email', details: error.message });
    }
});

router.get('/interview', async (req, res) => {
    try {
        const { job, skills } = req.query;
        if (!job || !skills) {
            return res.status(400).json({ error: 'Job title and skills are required' });
        }
        const prompt = `Generate 3 common interview questions for a ${job} role, tailored to skills: ${skills}.`;

        const response = await retryWithBackoff(async () => {
            return await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 100,
            });
        });

        const interviewQuestions = response.choices[0].message.content;
        res.send(interviewQuestions);
    } catch (error) {
        console.error('Interview questions generation error:', error.message);
        res.status(500).json({ error: 'Failed to generate questions', details: error.message });
    }
});

router.post('/mock-interview', async (req, res) => {
    try {
        const { job, skills } = req.body;
        if (!job || !skills) {
            return res.status(400).json({ error: 'Job title and skills are required' });
        }
        const prompt = `Act as an interviewer for a ${job} role. Ask a question tailored to skills: ${skills}, and provide feedback on a sample answer.`;

        const response = await retryWithBackoff(async () => {
            return await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
            });
        });

        const mockInterview = response.choices[0].message.content;
        res.send(mockInterview);
    } catch (error) {
        console.error('Mock interview generation error:', error.message);
        res.status(500).json({ error: 'Failed to generate mock interview', details: error.message });
    }
});

router.get('/career-coach', async (req, res) => {
    try {
        const { job, experience } = req.query;
        if (!job) {
            return res.status(400).json({ error: 'Job title is required' });
        }
        const prompt = `Provide a step-by-step career plan for someone with ${experience || 'no'} years of experience who wants to become a ${job}. Include education, skills to develop, networking tips, and job application strategies.`;

        const response = await retryWithBackoff(async () => {
            return await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 300,
            });
        });

        const careerPlan = response.choices[0].message.content;
        res.send(careerPlan);
    } catch (error) {
        console.error('Career plan generation error:', error.message);
        res.status(500).json({ error: 'Failed to generate career plan', details: error.message });
    }
});

module.exports = router;