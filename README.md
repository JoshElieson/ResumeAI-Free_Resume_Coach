# ResumeAI

An AI-powered resume review app that helps users upload a resume, receive structured feedback, and identify ways to improve clarity, impact, formatting, and job alignment.

The app is designed as a lightweight resume coach: users can analyze their resume, view improvement suggestions, and get AI-generated guidance through a clean web interface.

## Live Site

[ResumeAI](https://resume-ai-free-resume-coach.vercel.app/)

## Why I Built It

I wanted to build a practical AI product around a real user need: helping people quickly understand how their resume could be improved. The project combines document parsing, AI feedback generation, structured scoring, authentication, and a polished full-stack user experience.

## Features

- Resume upload and parsing
- AI-generated resume feedback
- Structured scoring across key resume categories
- Improvement suggestions for clarity, wording, and impact
- Resume-focused chatbot for follow-up questions
- Scan history for tracking previous reviews
- Clean responsive interface

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **AI:** OpenAI API
- **Validation:** Zod
- **Authentication:** NextAuth
- **Document Parsing:** PDF.js, pdf-parse, Mammoth
- **Deployment:** Vercel

## Engineering Highlights

- Built a resume analysis pipeline from file upload to parsed text to AI feedback
- Designed structured AI outputs for consistent scoring and recommendations
- Added document parsing support for common resume formats
- Implemented authentication and scan history for persistent user workflows
- Focused on clean UX so feedback is easy to understand and act on

## What I Learned

This project strengthened my ability to build AI-assisted web apps that turn unstructured documents into useful, structured feedback. It also gave me experience with prompt design, file parsing, authentication, validation, and designing user-facing AI features that feel practical rather than generic.

## Future Improvements

- Job-description-specific resume matching
- Resume version comparison
- More detailed ATS-style feedback
- Exportable improvement reports
- Better formatting analysis
- Saved improvement plans
