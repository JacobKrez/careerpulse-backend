const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();

// Enable trust proxy to handle X-Forwarded-For header correctly
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Validate API keys
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
    console.error('Error: OPENAI_API_KEY is not set. Please set it in .env or environment variables.');
    process.exit(1);
}

const adzunaAppId = process.env.ADZUNA_APP_ID;
const adzunaAppKey = process.env.ADZUNA_APP_KEY;
if (!adzunaAppId || !adzunaAppKey) {
    console.error('Error: ADZUNA_APP_ID and ADZUNA_APP_KEY must be set in .env or environment variables.');
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

// Landing page
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CareerPulseAI Backend API</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: 'Inter', sans-serif;
                }
                body {
                    background-color: #F9FAFB;
                    color: #1F2937;
                    line-height: 1.6;
                }
                /* Navigation Bar */
                nav {
                    background-color: #1E3A8A;
                    padding: 1rem 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                }
                nav .logo {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #FFFFFF;
                }
                nav a {
                    color: #FFFFFF;
                    text-decoration: none;
                    margin-left: 1.5rem;
                    font-weight: 500;
                    transition: color 0.3s ease;
                }
                nav a:hover {
                    color: #3B82F6;
                }
                /* Hero Section */
                .hero {
                    background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%);
                    color: #FFFFFF;
                    text-align: center;
                    padding: 4rem 2rem;
                    clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%);
                }
                .hero h1 {
                    font-size: 3rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                }
                .hero p {
                    font-size: 1.25rem;
                    font-weight: 400;
                    max-width: 600px;
                    margin: 0 auto;
                }
                /* Container */
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem;
                }
                /* Endpoint Cards */
                .endpoint {
                    background-color: #FFFFFF;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    padding: 1.5rem;
                    margin-bottom: 2rem;
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
                .endpoint:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
                }
                .endpoint h2 {
                    color: #1E3A8A;
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                }
                .endpoint p {
                    font-size: 1rem;
                    margin-bottom: 0.5rem;
                }
                .endpoint a {
                    color: #3B82F6;
                    text-decoration: none;
                    font-weight: 500;
                    transition: color 0.3s ease;
                }
                .endpoint a:hover {
                    color: #1E3A8A;
                    text-decoration: underline;
                }
                .endpoint pre {
                    background-color: #F9FAFB;
                    padding: 1rem;
                    border-radius: 4px;
                    overflow-x: auto;
                    font-size: 0.9rem;
                    line-height: 1.5;
                }
                /* Footer */
                footer {
                    background-color: #1E3A8A;
                    color: #FFFFFF;
                    text-align: center;
                    padding: 1.5rem;
                    margin-top: 2rem;
                }
                footer p {
                    font-size: 0.9rem;
                }
                footer a {
                    color: #3B82F6;
                    text-decoration: none;
                    font-weight: 500;
                }
                footer a:hover {
                    color: #FFFFFF;
                    text-decoration: underline;
                }
                /* Responsive Design */
                @media (max-width: 768px) {
                    .hero h1 {
                        font-size: 2rem;
                    }
                    .hero p {
                        font-size: 1rem;
                    }
                    nav {
                        flex-direction: column;
                        gap: 1rem;
                    }
                    nav a {
                        margin-left: 0;
                    }
                    .container {
                        padding: 1rem;
                    }
                }
            </style>
        </head>
        <body>
            <!-- Navigation Bar -->
            <nav>
                <div class="logo">CareerPulseAI</div>
                <div>
                    <a href="#api-docs">API Docs</a>
                    <a href="https://careerpulseai.netlify.app" target="_blank">Frontend</a>
                    <a href="https://github.com/JacobKrez/careerpulse-backend" target="_blank">GitHub</a>
                </div>
            </nav>

            <!-- Hero Section -->
            <section class="hero">
                <h1>CareerPulseAI Backend API</h1>
                <p>Powering career growth with AI-driven insights and real-time job data.</p>
            </section>

            <!-- API Documentation -->
            <div class="container" id="api-docs">
                <div class="endpoint">
                    <h2>GET /jobs</h2>
                    <p>Returns a list of static job listings.</p>
                    <p><a href="/jobs" target="_blank">Try it</a></p>
                    <p>Example Response:</p>
                    <pre>${JSON.stringify(jobsData, null, 2)}</pre>
                </div>
                <div class="endpoint">
                    <h2>GET /scrape?skills={skills}</h2>
                    <p>Fetches job listings from Adzuna based on the provided skills (e.g., "developer").</p>
                    <p><a href="/scrape?skills=developer" target="_blank">Try it with skills=developer</a></p>
                    <p>Example Response:</p>
                    <pre>
[
  {
    "title": "Software Developer",
    "company": "Tech Corp",
    "description": "Develop and maintain web applications..."
  },
  {
    "title": "Frontend Developer",
    "company": "Innovate Inc",
    "description": "Build user interfaces with React..."
  }
]
                    </pre>
                </div>
                <div class="endpoint">
                    <h2>GET /career-coach?job={job}&experience={experience}</h2>
                    <p>Generates a step-by-step career plan for the specified job and experience level.</p>
                    <p><a href="/career-coach?job=Investment%20Banker&experience=2" target="_blank">Try it with job=Investment Banker&experience=2</a></p>
                    <p>Example Response:</p>
                    <pre>
Step 1: Education
- Pursue a relevant degree in the field.
Step 2: Skills to Develop
- Build key skills required for the role.
Step 3: Networking Tips
- Connect with industry professionals.
Step 4: Job Application Strategies
- Tailor your resume and cover letter.
                    </pre>
                </div>
                <div class="endpoint">
                    <h2>GET /email?job={job}&skills={skills}&company={company}&experience={experience}</h2>
                    <p>Generates a professional outreach email for the specified job, skills, company, and experience.</p>
                    <p><a href="/email?job=Software%20Developer&skills=JavaScript&company=Tech%20Corp&experience=3" target="_blank">Try it with job=Software Developer&skills=JavaScript&company=Tech Corp&experience=3</a></p>
                    <p>Example Response:</p>
                    <pre>
Subject: Application for Software Developer Position at Tech Corp

Dear Hiring Manager,

I am excited to apply for the Software Developer position at Tech Corp. With 3 years of experience in software development, I have honed my skills in JavaScript, which I believe align well with the requirements of this role.

In my previous role, I successfully developed and maintained web applications, leveraging JavaScript to create dynamic and user-friendly interfaces. I am eager to bring my expertise to Tech Corp and contribute to your innovative projects.

Thank you for considering my application. I look forward to the opportunity to discuss how my skills and experience can benefit your team.

Best regards,
[Your Name]
                    </pre>
                </div>
                <div class="endpoint">
                    <h2>GET /interview?job={job}&skills={skills}</h2>
                    <p>Generates 3 common interview questions for the specified job, tailored to the provided skills.</p>
                    <p><a href="/interview?job=Software%20Developer&skills=JavaScript" target="_blank">Try it with job=Software Developer&skills=JavaScript</a></p>
                    <p>Example Response:</p>
                    <pre>
1. Can you describe a challenging project where you used JavaScript to solve a complex problem? How did you approach it?
2. How do you ensure the performance and scalability of your JavaScript code in a large-scale application?
3. What strategies do you use to debug JavaScript code, and can you walk us through a recent example?
                    </pre>
                </div>
                <div class="endpoint">
                    <h2>POST /mock-interview</h2>
                    <p>Generates a mock interview question and feedback for the specified job and skills.</p>
                    <p>Request Body: <code>{ "job": "Software Developer", "skills": "JavaScript" }</code></p>
                    <p>Example Response:</p>
                    <pre>
Interviewer: Can you explain how you would optimize a JavaScript function for better performance?

Sample Answer: I would start by analyzing the function's time complexity and identifying any redundant operations. For example, I’d use memoization to cache results of expensive computations and avoid unnecessary DOM manipulations by batching updates.

Feedback: Your answer provides a good starting point by mentioning time complexity and memoization. However, you could enhance it by discussing specific tools like Chrome DevTools for profiling, or by mentioning modern JavaScript features like Web Workers for offloading tasks.
                    </pre>
                </div>
            </div>

            <!-- Footer -->
            <footer>
                <p>© 2025 CareerPulseAI. All rights reserved. | <a href="https://github.com/JacobKrez/careerpulse-backend" target="_blank">GitHub</a></p>
            </footer>
        </body>
        </html>
    `);
});

// /jobs endpoint for static job data
app.get('/jobs', (req, res) => {
    res.json(jobsData);
});

// /scrape endpoint using Adzuna API
app.get('/scrape', async (req, res) => {
    const skills = req.query.skills || 'developer';
    if (!skills || typeof skills !== 'string' || skills.length > 100) {
        return res.status(400).json({ error: 'Invalid or missing skills parameter' });
    }

    try {
        const url = `http://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${adzunaAppId}&app_key=${adzunaAppKey}&what=${encodeURIComponent(skills)}&content-type=application/json`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Adzuna API request failed: ${response.statusText}`);
        }
        const data = await response.json();

        const jobs = data.results.map(job => ({
            title: job.title,
            company: job.company.display_name,
            description: job.description.slice(0, 200) + '...', // Truncate for brevity
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