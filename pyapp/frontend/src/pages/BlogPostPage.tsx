import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import SEO from '../components/SEO';

const posts: Record<
  string,
  {
    title: string;
    description: string;
    date: string;
    content: string;
  }
> = {
  'how-to-submit-assignment-online': {
    title: 'How to Submit an Assignment Online and Get Quality Results',
    description: 'Learn the step-by-step process for submitting project briefs online, setting budgets, and matching with vetted specialists for professional deliverables.',
    date: '2026-08-14',
    content: `
      <p>Submitting an assignment online has become the fastest way to get professional work done without the hassle of bidding wars or unverified freelancers. Here is how to do it right.</p>
      <h2>1. Write a clear project brief</h2>
      <p>Start with the project title, expected deliverables, deadline, and budget. The more specific you are, the faster the right specialist can be matched to your work.</p>
      <h2>2. Choose the right category</h2>
      <p>Most managed platforms let you pick from categories like design, research, writing, or administrative tasks. This helps admins route your request to the correct expert.</p>
      <h2>3. Set a realistic budget and deadline</h2>
      <p>A clear budget and future deadline prevent delays. Managed platforms often review your brief before assigning a specialist to ensure feasibility.</p>
      <h2>4. Review quality before approval</h2>
      <p>After a specialist submits the deliverable, the platform team reviews it for quality. You only approve work that meets your standards.</p>
      <h2>5. Track progress in one place</h2>
      <p>Look for a platform that gives you status updates, file sharing, and messaging in a single dashboard. That is the modern way to manage assignments.</p>
    `,
  },
  'hire-vetted-specialists': {
    title: 'Why You Should Hire Vetted Specialists for Critical Projects',
    description: 'Vetted specialists save time, reduce risk, and deliver consistent quality. See why managed assignment platforms are replacing open bidding for professional work.',
    date: '2026-08-10',
    content: `
      <p>When a project matters, you need more than a low bid. You need a specialist who has been reviewed, tested, and approved by professionals.</p>
      <h2>What does vetted mean?</h2>
      <p>A vetted specialist has passed skills verification, background checks, and quality reviews. Managed platforms maintain these standards so clients do not have to.</p>
      <h2>Managed quality vs open bidding</h2>
      <p>Open bidding sites reward the cheapest offer. Managed platforms reward the best outcome. Quality assurance steps, admin review, and structured workflows keep standards high.</p>
      <h2>Private and professional</h2>
      <p>Clients on managed platforms access only their own assignments and data. There is no public competition, no spam, and no unfinished work.</p>
    `,
  },
  'managed-assignment-platform-benefits': {
    title: '5 Benefits of a Managed Assignment Platform for Clients',
    description: 'From no bidding to private dashboards, managed assignment platforms offer clients a faster, safer way to outsource professional tasks.',
    date: '2026-08-05',
    content: `
      <p>Managed assignment platforms are changing how clients outsource work. Instead of posting jobs and screening hundreds of proposals, you submit one brief and let the platform handle the rest.</p>
      <h2>1. No bidding required</h2>
      <p>You set the scope and budget. The team assigns the right specialist. No auctions, no negotiations, no delays.</p>
      <h2>2. Expert review before work starts</h2>
      <p>Admins clarify requirements and confirm the specialist fits the task. This reduces miscommunication and rework.</p>
      <h2>3. Quality assurance built in</h2>
      <p>Every deliverable is reviewed before you see it. If it does not meet standards, it is revised or reassigned.</p>
      <h2>4. Private by design</h2>
      <p>Your project details, files, and conversations stay private. Only you and the assigned specialist access your assignment.</p>
      <h2>5. Clear tracking and timelines</h2>
      <p>Status updates, deadlines, and files live in one dashboard. You always know where your project stands.</p>
    `,
  },
};

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? posts[slug] : undefined;

  const seoTitle = post ? post.title : 'Post Not Found';
  const seoDescription = post ? post.description : 'The blog post you are looking for does not exist.';
  const canonical = post
    ? `https://bitshustlehubs.co.ke/blog/${slug}`
    : 'https://bitshustlehubs.co.ke/blog';

  const articleSchema = useMemo(() => {
    if (!post) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      author: {
        '@type': 'Organization',
        name: 'Bits Hustle Hub',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Bits Hustle Hub',
        logo: {
          '@type': 'ImageObject',
          url: 'https://bitshustlehubs.co.ke/favicon.svg',
        },
      },
      mainEntityOfPage: canonical,
    };
  }, [post, canonical]);

  if (!post) {
    return (
      <div className="min-h-screen bg-base-100 text-base-content">
        <SEO
          title="Post Not Found"
          description="The blog post you are looking for does not exist."
          noIndex
        />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-black mb-4">Post Not Found</h1>
          <p className="text-base-content/70 mb-8">The article you are looking for does not exist or has been removed.</p>
          <Link to="/blog" className="btn btn-primary">
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <SEO
        title={seoTitle}
        description={seoDescription}
        type="article"
        canonical={canonical}
        breadcrumbs={[
          { name: 'Home', item: 'https://bitshustlehubs.co.ke/' },
          { name: 'Blog', item: 'https://bitshustlehubs.co.ke/blog' },
          { name: post.title, item: canonical },
        ]}
        language="en"
        alternateLanguages={[
          { hreflang: 'en', href: `https://bitshustlehubs.co.ke/blog/${slug}` },
          { hreflang: 'sw', href: `https://bitshustlehubs.co.ke/sw/blog/${slug}` },
          { hreflang: 'x-default', href: `https://bitshustlehubs.co.ke/blog/${slug}` },
        ]}
        schema={articleSchema ?? undefined}
      />

      <header className="navbar bg-base-100 border-b border-base-300 sticky top-0 z-40">
        <div className="max-w-7xl w-full mx-auto px-4 md:px-6 flex items-center">
          <div className="flex-1">
            <Link to="/" className="text-xl md:text-2xl font-black tracking-tight">
              <span className="text-primary">Bits</span> Hustle Hub
            </Link>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <Link to="/" className="btn btn-ghost btn-sm">Home</Link>
            <Link to="/about-us" className="btn btn-ghost btn-sm">About Us</Link>
            <Link to="/blog" className="btn btn-ghost btn-sm">Blog</Link>
            <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-16">
        <article>
          <div className="text-sm text-base-content/60 mb-4">{post.date}</div>
          <h1 className="text-3xl md:text-4xl font-black mb-6">{post.title}</h1>
          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        <div className="mt-12 pt-8 border-t border-base-300">
          <Link to="/blog" className="btn btn-outline btn-sm">
            ← Back to Blog
          </Link>
        </div>
      </main>

      <footer className="footer footer-center bg-neutral text-neutral-content p-8">
        <aside>
          <p className="font-bold text-lg">Bits Hustle Hub</p>
          <p>Professional assignment management and gig platform.</p>
          <p className="opacity-60">© 2026 Bits Hustle Hub. All rights reserved.</p>
        </aside>
      </footer>
    </div>
  );
}
