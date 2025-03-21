const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cors = require('cors');
const OpenAI = require('openai');
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

// Scrape endpoint with enhanced functionality
app.get('/scrape', async (req, res) => {
    const skills = req.query.skills || 'developer';
    let browser;
    let attempts = 0;
    const maxAttempts = 3;
    const initialDelay = 2000;

    while (attempts < maxAttempts) {
        try {
            console.log(`Attempt ${attempts + 1} to scrape jobs for skills: ${skills}`);

            // Launch Puppeteer with optimized settings for Render
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox', // Required for Docker on Render
                    '--disable-setuid-sandbox',
                    '--disable-crash-reporter', // Disable crash reporting to avoid crashpad issues
                    '--no-first-run',
                    '--disable-gpu', // Helps in headless environments
                    '--disable-dev-shm-usage', // Avoids shared memory issues in Docker
                ],
                executablePath: '/usr/bin/chromium', // Hardcoded path for Render
                ignoreDefaultArgs: ['--enable-crash-reporter'], // Explicitly ignore crash reporter
            });

            const page = await browser.newPage();

            // Anti-bot measures
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            );
            await page.setViewport({ width: 1280, height: 720 });

            console.log(`Navigating to Indeed with skills: ${skills}`);
            const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(skills)}&l=`;
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Add a delay to mimic human behavior and wait for dynamic content
            await page.waitForTimeout(3000);

            // Scroll to load more jobs
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= scrollHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });

            // Scrape job titles (updated selector for Indeed as of 2025)
            await page.waitForSelector('h2.jobtitle a span[title]', { timeout: 10000 });
            const jobs = await page.$$eval('h2.jobtitle a span[title]', nodes =>
                nodes.map(n => n.textContent.trim()).filter(t => t.length > 0)
            );

            if (jobs.length === 0) {
                console.warn('No jobs found. The selector might be outdated or the page didn’t load correctly.');
                throw new Error('No jobs found on the page');
            }

            console.log(`Scraped ${jobs.length} jobs: ${jobs.join(', ')}`);
            await browser.close();
            return res.json(jobs.slice(0, 5));
        } catch (error) {
            attempts++;
            console.error(`Attempt ${attempts} failed. Error:`, error.message, error.stack);
            if (browser) await browser.close();

            if (attempts === maxAttempts) {
                return res.status(500).json({
                    error: 'Failed to scrape jobs after multiple attempts',
                    details: error.message,
                });
            }

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, initialDelay * Math.pow(2, attempts)));
        }
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