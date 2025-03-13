const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cors = require('cors');
const OpenAI = require('openai');
const { execSync } = require('child_process');
require('dotenv').config();

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());

// Validate API key
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
    console.error('Error: OPENAI_API_KEY is not set. Please set it in .env or environment variables.');
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: openaiApiKey,
});

app.get('/scrape', async (req, res) => {
    try {
        const skills = req.query.skills || 'developer';
        const executablePath = '/usr/bin/chromium'; // Explicit Chromium path
        console.log('Launching Puppeteer with executable path:', executablePath);
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            executablePath: executablePath,
        });
        console.log('Browser launched successfully');
        const page = await browser.newPage();

        console.log(`Navigating to https://www.jobindex.dk/jobsoegning?q=${skills}`);
        await page.goto(`https://www.jobindex.dk/jobsoegning?q=${skills}`, {
            waitUntil: 'networkidle2',
        });
        console.log('Page loaded, waiting for selector');
        await page.waitForSelector('.jobsearch-result a', { timeout: 10000 });

        const jobs = await page.$$eval('.jobsearch-result a', nodes =>
            nodes.map(n => n.innerText.trim()).filter(t => t.length > 0)
        );
        console.log('Jobs scraped:', jobs);
        await browser.close();

        res.json(jobs.slice(0, 5));
    } catch (error) {
        console.error('Scrape error:', error);
        res.status(500).json({ error: 'Failed to scrape data' });
    }
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

app.get('/email', async (req, res) => {
    try {
        const { job, skills } = req.query;
        if (!job || !skills) {
            return res.status(400).send('Job title and skills are required');
        }
        const prompt = `Write a concise, professional outreach email for a ${job} position, highlighting skills: ${skills}.`;

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
        console.error('Email error:', error);
        res.status(500).send('Failed to generate email');
    }
});

app.get('/interview', async (req, res) => {
    try {
        const { job, skills } = req.query;
        if (!job || !skills) {
            return res.status(400).send('Job title and skills are required');
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
        console.error('Interview error:', error);
        res.status(500).send('Failed to generate questions');
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));