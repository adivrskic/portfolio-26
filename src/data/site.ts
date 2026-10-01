import type { Social } from './types'

/**
 * Copy for the About and Contact sections. Wrap words in **double asterisks** to set them in ink;
 * everything else reads in the softer grey (the two-tone style of the reference site).
 */
export const SITE = {
  name: 'Adi Vrskic',
  role: 'Creative Developer',
  title: 'Full-Stack Creative Developer',
  location: 'US East Coast (EST) · Remote or hybrid',
  /** the line search engines and link previews show for the site (see the seo plugin in vite.config.ts) */
  description:
    'Full-stack creative developer and AI engineer building AI-powered products, immersive 3D web experiences and React apps that feel finished.',
  email: 'adivrskic123@gmail.com',
  about: {
    lead: '**I build things that feel alive.**',
    paragraphs: [
      '**Full-stack creative developer** with 8+ years of experience in **React**, **TypeScript**, **Three.js**, and **AI integration**. Currently engineering front-end solutions at a **Fortune 50 retailer**, building features used by millions of customers.',
      'I ship **AI-powered products**, build **immersive 3D web experiences**, and care deeply about **performance** and **clean architecture**. Every project is a chance to push the craft forward.',
    ],
    /** what Adi builds with now, by area (from the resume and what the recent repos actually use); the
     *  chat's brief lists the same (SKILLS in netlify/functions/chat.js), so keep the two in step */
    toolkit: [
      {
        label: 'AI & ML',
        items: ['Claude API', 'OpenAI', 'agents & tool use', 'MCP', 'Claude Code', 'structured outputs', 'PyTorch → ONNX', 'TensorFlow.js'],
      },
      { label: 'Front end', items: ['React 19', 'Next.js App Router', 'TypeScript', 'Tailwind CSS 4', 'Vite', 'Zustand'] },
      { label: '3D & motion', items: ['Three.js', 'React Three Fiber', 'GLSL shaders', 'WebGPU', 'GSAP', 'Motion'] },
      { label: 'Back end', items: ['Node.js', 'Python', 'Postgres', 'Supabase', 'Redis', 'Stripe', 'Cloudflare Workers'] },
      { label: 'Mobile', items: ['Expo', 'React Native', 'PWAs', 'Chrome extensions'] },
      { label: 'Shipping', items: ['Vitest', 'Playwright', 'Storybook', 'GitHub Actions', 'Turborepo', 'Sentry'] },
    ],
    education: '**B.S. Computer Science**, Kennesaw State University',
    based: 'Based on the **US East Coast (EST)**, working **remote or hybrid**.',
  },
  contact: {
    lead: 'Have a project in mind, or just want to **say hi**?',
  },
  socials: [
    { label: 'GitHub', href: 'https://github.com/adivrskic', handle: 'adivrskic', icon: 'github' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/adi-vrskic', handle: 'in/adi-vrskic', icon: 'linkedin' },
    { label: 'Email', href: 'mailto:adivrskic123@gmail.com', handle: 'adivrskic123@gmail.com', icon: 'mail' },
  ] satisfies Social[],
}
