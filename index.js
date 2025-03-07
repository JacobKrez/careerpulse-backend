const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cors = require('cors');
const OpenAI = require('openai');

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());

require('dotenv').config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

app.get('/scrape', async (req, res) => {
  try {
    const skills = req.query.skills || 'developer';
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(`https://www.jobindex.dk/jobsoegning?q=${skills}`, {
      waitUntil: 'networkidle2',
    });
    await page.waitForSelector('.jobsearch-result a', { timeout: 10000 });

    const jobs = await page.$$eval('.jobsearch-result a', nodes =>
      nodes.map(n => n.innerText.trim()).filter(t => t.length > 0)
    );
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

app.listen(5000, () => console.log('Server on 5000'));