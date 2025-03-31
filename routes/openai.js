// routes/openai.js
const express = require('express');
const OpenAI = require('openai');
const { query, body, validationResult } = require('express-validator');
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

router.get(
  '/email',
  [
    query('job').trim().notEmpty().withMessage('Job title is required').isLength({ max: 100 }),
    query('skills').trim().notEmpty().withMessage('Skills are required').isLength({ max: 200 }),
    query('company').optional().trim().isLength({ max: 100 }),
    query('experience').optional().trim().isNumeric().withMessage('Experience must be a number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { job, skills, company, experience } = req.query;
      const prompt = `You are a career coach helping a professional craft a polished outreach email. Write a concise, professional, and enthusiastic email for a ${job} position at ${company || 'a leading company in the industry'}. Highlight the candidate's key skills: ${skills}, and emphasize their ${experience || 'several'} years of experience. Use a formal yet approachable tone, include a clear call to action (e.g., requesting a meeting or interview), and keep the email under 150 words. Format the email with a subject line, greeting, body, and closing signature (e.g., "Best regards, [Candidate Name]").`;

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
  }
);

router.get(
  '/interview',
  [
    query('job').trim().notEmpty().withMessage('Job title is required').isLength({ max: 100 }),
    query('skills').trim().notEmpty().withMessage('Skills are required').isLength({ max: 200 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { job, skills } = req.query;
      const prompt = `You are a hiring manager with expertise in interviewing candidates. Generate exactly 3 common interview questions for a ${job} role, tailored to the candidate's skills: ${skills}. The questions should be relevant, specific, and designed to assess both technical and behavioral competencies. Format the questions as a numbered list (e.g., "1. Question text"). Ensure each question is concise and actionable, suitable for a 30-minute interview.`;

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
  }
);

router.post(
  '/mock-interview',
  [
    body('job').trim().notEmpty().withMessage('Job title is required').isLength({ max: 100 }),
    body('skills').trim().notEmpty().withMessage('Skills are required').isLength({ max: 200 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { job, skills } = req.body;
      const prompt = `You are an experienced interviewer conducting a mock interview for a ${job} role. Ask one challenging yet relevant interview question tailored to the candidate's skills: ${skills}. The question should encourage the candidate to demonstrate both technical expertise and problem-solving ability. After the question, provide a sample answer (as if given by the candidate), and then give constructive feedback on the sample answer, highlighting strengths and suggesting one specific area for improvement. Format the response as follows: "Question: [Question text]\nSample Answer: [Answer text]\nFeedback: [Feedback text]". Keep the response concise and professional.`;

      const response = await retryWithBackoff(async () => {
        return await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
        });
      });

      const mockInterview = response.choices[0].message.content;
      res.send(mockInterview);
    } catch (error) {
      console.error('Mock interview generation error:', error.message);
      res.status(500).json({ error: 'Failed to generate mock interview', details: error.message });
    }
  }
);

router.get(
  '/career-coach',
  [
    query('job').trim().notEmpty().withMessage('Job title is required').isLength({ max: 100 }),
    query('experience').optional().trim().isNumeric().withMessage('Experience must be a number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { job, experience } = req.query;
      const prompt = `You are a career coach with 20 years of experience helping professionals grow in their careers. Provide a detailed, step-by-step career plan for someone with ${experience || '0'} years of experience who wants to become a ${job}. The plan should be tailored to their experience level (e.g., beginner, intermediate, or advanced) and include the following sections: 1) Education and Certifications (specific degrees or courses), 2) Skills to Develop (list 3-5 key skills with learning resources), 3) Networking Tips (actionable strategies to connect with professionals), and 4) Job Application Strategies (e.g., resume tips, interview prep). Format the plan as a numbered list with clear headings for each section (e.g., "1. Education and Certifications"). Ensure the plan is practical, actionable, and encouraging.`;

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
  }
);

module.exports = router;