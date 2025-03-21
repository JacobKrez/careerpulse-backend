const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cors = require('cors');
const OpenAI = require('openai');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());
app.use(express.json());

// Rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Validate API key
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
    console.error('Error: OPENAI_API_KEY is not set. Please set it in .env or environment variables.');
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: openaiApiKey,
});

// Static job data as a fallback
const jobsData = [
    { title: 'Investment Banker', company: 'Goldman Sachs', description: 'Analyze financial data and manage client portfolios.' },
    { title: 'Financial Analyst', company: 'JPMorgan Chase', description: 'Prepare reports and forecasts for investment decisions.' },
];

// /jobs endpoint for static job data
app.get('/jobs', (req, res) => {
    res.json(jobsData);
});

// Enhanced /scrape endpoint
app.get('/scrape', async (req, res) => {
    const skills = req.query.skills || 'developer';
    if (!skills || typeof skills !== 'string' || skills.length > 100) {
        return res.status(400).json({ error: 'Invalid or missing skills parameter' });
    }

    let browser;
    let attempts = 0;
    const maxAttempts = 3;
    const initialDelay = 2000;

    while (attempts < maxAttempts) {
        try {
            console.log(`Attempt ${attempts + 1} to scrape jobs for skills: ${skills}`);

            // Launch Puppeteer with bundled Chromium
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-crash-reporter',
                    '--no-first-run',
                    '--disable-gpu',
                    '--disable-dev-shm-usage',
                ],
                ignoreDefaultArgs: ['--enable-crash-reporter'],
            });

            const page = await browser.newPage();

            // Anti-bot measures
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );
            await page.setViewport({ width: 1280, height: 720 });

            console.log(`Navigating to Indeed with skills: ${skills}`);
            const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(skills)}&l=`;
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Wait for dynamic content to load
            await page.waitForTimeout(5000);

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

            // Scrape job details (updated selector for Indeed as of 2025)
            const jobs = await page.evaluate(() => {
                const jobCards = document.querySelectorAll('div.job_seen_beacon');
                const jobList = [];
                jobCards.forEach(card => {
                    const titleElement = card.querySelector('h2 a span');
                    const companyElement = card.querySelector('span.companyName');
                    const descriptionElement = card.querySelector('div.job-snippet');
                    const title = titleElement ? titleElement.textContent.trim() : '';
                    const company = companyElement ? companyElement.textContent.trim() : 'Unknown Company';
                    const description = descriptionElement ? descriptionElement.textContent.trim() : 'No description available';
                    if (title) {
                        jobList.push({ title, company, description });
                    }
                });
                return jobList;
            });

            if (jobs.length === 0) {
                console.warn('No jobs found. The selector might be outdated or the page didn’t load correctly.');
                throw new Error('No jobs found on the page');
            }

            console.log(`Scraped ${jobs.length} jobs`);
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

            // Exponential backoff
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
        const { job, skills, company, experience } = req.query;
        if (!job || !skills) {
            return res.status(400).send('Job title and skills are required');
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

app.post('/mock-interview', async (req, res) => {
    try {
        const { job, skills } = req.body;
        if (!job || !skills) {
            return res.status(400).send('Job title and skills are required');
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
        console.error('Mock interview error:', error);
        res.status(500).send('Failed to generate mock interview');
    }
});

app.get('/career-coach', async (req, res) => {
    try {
        const { job, experience } = req.query;
        if (!job) {
            return res.status(400).send('Job title is required');
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
        console.error('Career coach error:', error);
        res.status(500).send('Failed to generate career plan');
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));