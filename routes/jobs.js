// routes/jobs.js
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// Static job data as a fallback
const jobsData = [
    { title: 'Investment Banker', company: 'Goldman Sachs', description: 'Analyze financial data and manage client portfolios.' },
    { title: 'Financial Analyst', company: 'JPMorgan Chase', description: 'Prepare reports and forecasts for investment decisions.' },
];

// /jobs endpoint for static job data
router.get('/', (req, res) => {
    res.json(jobsData);
});

// /scrape endpoint using Adzuna API
router.get('/scrape', async (req, res) => {
    const skills = req.query.skills || 'developer';
    if (!skills || typeof skills !== 'string' || skills.length > 100) {
        return res.status(400).json({ error: 'Invalid or missing skills parameter' });
    }

    try {
        const url = `http://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=${encodeURIComponent(skills)}&content-type=application/json`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Adzuna API request failed: ${response.statusText}`);
        }
        const data = await response.json();

        const jobs = data.results.map(job => ({
            title: job.title,
            company: job.company.display_name,
            description: job.description.slice(0, 200) + '...',
        }));

        if (jobs.length === 0) {
            return res.status(404).json({ error: 'No jobs found for the given skills' });
        }

        res.json(jobs.slice(0, 5));
    } catch (error) {
        console.error('Error fetching jobs from Adzuna:', error.message);
        res.status(500).json({
            error: 'Failed to fetch jobs',
            details: error.message,
        });
    }
});

module.exports = router;