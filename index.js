// index.js
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet'); // Added for security headers
const morgan = require('morgan'); // Added for request logging
require('dotenv').config();

// Import routes
const jobsRoutes = require('./routes/jobs');
const openaiRoutes = require('./routes/openai');
const stripeRoutes = require('./routes/stripe');

const app = express();

// Enable trust proxy to handle X-Forwarded-For header correctly
app.set('trust proxy', 1);

// Security middleware
app.use(helmet()); // Set security headers
app.use(cors({ origin: 'https://careerpulseai.netlify.app' })); // Restrict CORS to your frontend
app.use(express.json());

// Request logging
app.use(morgan('combined')); // Log requests in a detailed format

// Rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Validate environment variables
const requiredEnvVars = ['OPENAI_API_KEY', 'ADZUNA_APP_ID', 'ADZUNA_APP_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Error: ${envVar} is not set. Please set it in .env or environment variables.`);
        process.exit(1);
    }
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    res.status(500).json({ error: 'Something went wrong', details: err.message });
});

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
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem;
                }
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
            <nav>
                <div class="logo">CareerPulseAI</div>
                <div>
                    <a href="#api-docs">API Docs</a>
                    <a href="https://careerpulseai.netlify.app" target="_blank">Frontend</a>
                    <a href="https://github.com/JacobKrez/careerpulse-backend" target="_blank">GitHub</a>
                </div>
            </nav>
            <section class="hero">
                <h1>CareerPulseAI Backend API</h1>
                <p>Powering career growth with AI-driven insights, real-time job data, and subscription management.</p>
            </section>
            <div class="container" id="api-docs">
                <div class="endpoint">
                    <h2>GET /jobs</h2>
                    <p>Returns a list of static job listings.</p>
                    <p><a href="/jobs" target="_blank">Try it</a></p>
                    <p>Example Response:</p>
                    <pre>${JSON.stringify([
                        { title: 'Investment Banker', company: 'Goldman Sachs', description: 'Analyze financial data and manage client portfolios.' },
                        { title: 'Financial Analyst', company: 'JPMorgan Chase', description: 'Prepare reports and forecasts for investment decisions.' }
                    ], null, 2)}</pre>
                </div>
                <div class="endpoint">
                    <h2>GET /jobs/scrape?skills={skills}</h2>
                    <p>Fetches job listings from Adzuna based on the provided skills (e.g., "developer").</p>
                    <p><a href="/jobs/scrape?skills=developer" target="_blank">Try it with skills=developer</a></p>
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
                    <h2>GET /openai/career-coach?job={job}&experience={experience}</h2>
                    <p>Generates a step-by-step career plan for the specified job and experience level.</p>
                    <p><a href="/openai/career-coach?job=Investment%20Banker&experience=2" target="_blank">Try it with job=Investment Banker&experience=2</a></p>
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
                    <h2>GET /openai/email?job={job}&skills={skills}&company={company}&experience={experience}</h2>
                    <p>Generates a professional outreach email for the specified job, skills, company, and experience.</p>
                    <p><a href="/openai/email?job=Software%20Developer&skills=JavaScript&company=Tech%20Corp&experience=3" target="_blank">Try it with job=Software Developer&skills=JavaScript&company=Tech Corp&experience=3</a></p>
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
                    <h2>GET /openai/interview?job={job}&skills={skills}</h2>
                    <p>Generates 3 common interview questions for the specified job, tailored to the provided skills.</p>
                    <p><a href="/openai/interview?job=Software%20Developer&skills=JavaScript" target="_blank">Try it with job=Software Developer&skills=JavaScript</a></p>
                    <p>Example Response:</p>
                    <pre>
1. Can you describe a challenging project where you used JavaScript to solve a complex problem? How did you approach it?
2. How do you ensure the performance and scalability of your JavaScript code in a large-scale application?
3. What strategies do you use to debug JavaScript code, and can you walk us through a recent example?
                    </pre>
                </div>
                <div class="endpoint">
                    <h2>POST /openai/mock-interview</h2>
                    <p>Generates a mock interview question and feedback for the specified job and skills.</p>
                    <p>Request Body: <code>{ "job": "Software Developer", "skills": "JavaScript" }</code></p>
                    <p>Example Response:</p>
                    <pre>
Interviewer: Can you explain how you would optimize a JavaScript function for better performance?

Sample Answer: I would start by analyzing the function's time complexity and identifying any redundant operations. For example, I’d use memoization to cache results of expensive computations and avoid unnecessary DOM manipulations by batching updates.

Feedback: Your answer provides a good starting point by mentioning time complexity and memoization. However, you could enhance it by discussing specific tools like Chrome DevTools for profiling, or by mentioning modern JavaScript features like Web Workers for offloading tasks.
                    </pre>
                </div>
                <div class="endpoint">
                    <h2>POST /stripe/create-checkout-session</h2>
                    <p>Creates a Stripe Checkout session for a subscription payment.</p>
                    <p>Request Body: <code>{ "userId": "user_id_here" }</code></p>
                    <p>Example Response:</p>
                    <pre>
{
  "id": "cs_test_XXXXXXXXXXXXXXXXXXXX"
}
                    </pre>
                </div>
            </div>
            <footer>
                <p>© 2025 CareerPulseAI. All rights reserved. | <a href="https://github.com/JacobKrez/careerpulse-backend" target="_blank">GitHub</a></p>
            </footer>
        </body>
        </html>
    `);
});

// Mount routes
app.use('/jobs', jobsRoutes);
app.use('/openai', openaiRoutes);
app.use('/stripe', stripeRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});