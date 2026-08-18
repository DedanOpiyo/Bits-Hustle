import {
  FormEvent,
  useMemo,
  useState,
} from 'react';

import { useLocation } from 'react-router-dom';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  assignmentAPI,
  assignmentCategoryAPI,
} from '../services/api';

import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

import SEO from '../components/SEO';
import { usePlatforms } from '../constants/platforms';
import { Icon } from '../components/Icon';

const priorities = [
  'Low',
  'Medium',
  'High',
  'Urgent',
];

const steps = [
  [
    'Submit Your Brief',
    'Provide project details, budget, deadline, and reference files.',
  ],
  [
    'Expert Review',
    'Our team reviews your brief, clarifies requirements, and selects the ideal specialist.',
  ],
  [
    'Expert Execution',
    'A vetted specialist completes the work and submits the deliverable.',
  ],
  [
    'Quality Assurance',
    'Our team reviews the deliverable and marks the assignment complete upon approval.',
  ],
];

const testimonials = [
  {
    name: 'Sarah M.',
    role: 'Client',
    text: 'Bits Hustle Hub made it so easy to get my project done. No bidding, no stress — just results.',
  },
  {
    name: 'James K.',
    role: 'Specialist',
    text: 'I love how assignments are managed and reviewed. The quality assurance process keeps standards high.',
  },
  {
    name: 'Amina R.',
    role: 'Client',
    text: 'The platform is private, professional, and the team actually follows through. Highly recommended.',
  },
];

function roleName(user: any) {
  return (
    user?.role?.name ||
    user?.roles?.[0] ||
    ''
  ).toUpperCase();
}

function getPlatformUrl(template?: string): string {
  if (!template) return '#';
  return template;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();

  const [openModal, setOpenModal] = useState(false);

  const {
    data: categoriesData = [],
  } = useQuery({
    queryKey: ['assignment-categories'],

    queryFn: async () => {
      const response =
        await assignmentCategoryAPI.getCategories();

      return response.data || [];
    },
  });

  const {
    data: platformsData = [],
  } = usePlatforms();

  const categories = useMemo(
    () =>
      categoriesData.map(
        (category: any) =>
          category.display_name ||
          category.name
      ),
    [categoriesData]
  );

  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    budget: '',
    deadline: '',
    priority: 'Medium',
    files: '',
    client_name: '',
    client_email: '',
    client_phone: '',
  });

  const [briefFiles, setBriefFiles] =
    useState<FileList | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const uploadedFiles = briefFiles
        ? await Promise.all(
            Array.from(briefFiles).map(
              async (file) => {
                const response =
                  await assignmentAPI.uploadBriefFile(
                    file
                  );

                return response.data;
              }
            )
          )
        : [];

      const manualFiles = form.files
        .split(',')
        .map((file) => file.trim())
        .filter(Boolean);

      const payload = {
        ...form,

        budget: Number(form.budget),

        files: [
          ...uploadedFiles,
          ...manualFiles,
        ],
      };

      return assignmentAPI.createPublicAssignment(
        payload
      );
    },

    onSuccess: () => {
      setForm({
        title: '',
        category: '',
        description: '',
        budget: '',
        deadline: '',
        priority: 'Medium',
        files: '',
        client_name: '',
        client_email: '',
        client_phone: '',
      });

      setBriefFiles(null);

      queryClient.invalidateQueries({
        queryKey: ['gig-assignments'],
      });

      toast(
        'Assignment request submitted. Admin has been notified.',
        'success'
      );

      setOpenModal(false);
    },

    onError: () => {
      toast(
        'Failed to submit assignment. Please try again.',
        'error'
      );
    },
  });

  const onSubmit = (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (
      !form.title ||
      !form.description ||
      !form.budget ||
      !form.deadline ||
      !form.client_name ||
      !form.client_email
    ) {
      toast(
        'Please fill in all required fields.',
        'warning'
      );

      return;
    }

    const budgetNum =
      parseFloat(form.budget);

    if (
      Number.isNaN(budgetNum) ||
      budgetNum <= 0
    ) {
      toast(
        'Budget must be a number greater than zero.',
        'warning'
      );

      return;
    }

    const deadlineDate =
      new Date(form.deadline);

    if (
      Number.isNaN(
        deadlineDate.getTime()
      )
    ) {
      toast(
        'Invalid date.',
        'warning'
      );

      return;
    }

    if (
      deadlineDate <= new Date()
    ) {
      toast(
        'Deadline must be a future date.',
        'warning'
      );

      return;
    }

    createMutation.mutate();
  };

  const handleSubmitAssignment = () => {
    setOpenModal(true);
  };

  const handleAccessPlatform = () => {
    const platformsSection = document.getElementById('platforms');
    if (platformsSection) {
      platformsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleViewGigs = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    const role = roleName(user);

    if (
      [
        'CLIENT',
        'GIG_WORKER',
        'ADMIN',
        'SUPER_ADMIN',
      ].includes(role)
    ) {
      navigate('/my-gigs');
      return;
    }

    navigate('/login');
  };

  const pageSchema = useMemo(() => {
    const baseSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Bits Hustle Hub - Professional Assignment Management',
      description: 'Submit your project brief once. Our team reviews requirements, matches you with qualified specialists, and manages quality from start to finish.',
      url: 'https://bitshustlehubs.co.ke/',
    };

    if (location.pathname === '/about-us') {
      baseSchema['@type'] = 'AboutPage';
      baseSchema.name = 'About Bits Hustle Hub';
      baseSchema.description = 'Learn how Bits Hustle Hub connects clients, specialists and opportunities through a managed assignment platform.';
      baseSchema.url = 'https://bitshustlehubs.co.ke/about-us';
    } else if (location.pathname === '/landingpage') {
      baseSchema.name = 'Bits Hustle Hub Services';
      baseSchema.description = 'Discover Bits Hustle Hub services: managed assignments, platform access, and vetted specialist matching for professional results.';
      baseSchema.url = 'https://bitshustlehubs.co.ke/landingpage';
    }

    return baseSchema;
  }, [location.pathname]);

  const reviewSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    reviewBody: testimonials.map((t) => ({
      '@type': 'Review',
      author: t.name,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: '5',
        bestRating: '5',
      },
      reviewBody: t.text,
    })),
  }), []);

  const howToSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Submit an Assignment on Bits Hustle Hub',
    description: 'A streamlined managed workflow designed for clients seeking professional results.',
    step: steps.map(([title, description]) => ({
      '@type': 'HowToStep',
      name: title,
      text: description,
    })),
  }), []);

  return (
    <div className="min-h-screen bg-base-100 text-base-content">

      <SEO
        title={
          location.pathname === '/about-us'
            ? 'About Us'
            : location.pathname === '/landingpage'
              ? 'Our Services'
              : undefined
        }
        description={
          location.pathname === '/about-us'
            ? 'Learn how Bits Hustle Hub connects clients, specialists and opportunities through a managed assignment platform.'
            : location.pathname === '/landingpage'
              ? 'Discover Bits Hustle Hub services: managed assignments, platform access, and vetted specialist matching for professional results.'
              : undefined
        }
        type="website"
        schema={pageSchema}
        breadcrumbs={[
          { name: 'Home', item: 'https://bitshustlehubs.co.ke/' },
          ...(location.pathname === '/about-us'
            ? [{ name: 'About Us', item: 'https://bitshustlehubs.co.ke/about-us' }]
            : location.pathname === '/landingpage'
              ? [{ name: 'Services', item: 'https://bitshustlehubs.co.ke/landingpage' }]
              : []),
        ]}
        language="en"
        alternateLanguages={[
          { hreflang: 'en', href: `https://bitshustlehubs.co.ke${location.pathname}` },
          { hreflang: 'sw', href: `https://bitshustlehubs.co.ke/sw${location.pathname}` },
          { hreflang: 'x-default', href: `https://bitshustlehubs.co.ke${location.pathname}` },
        ]}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <header className="navbar bg-base-100 border-b border-base-300 sticky top-0 z-40">

        <div className="max-w-7xl w-full mx-auto px-4 md:px-6 flex items-center">

          {/* LOGO */}

          <div className="flex-1">

            <Link
              to="/"
              className="text-xl md:text-2xl font-black tracking-tight"
            >
              <span className="text-primary">
                Bits
              </span>
              Hustle Hub
            </Link>

          </div>


          {/* DESKTOP NAVIGATION */}

          <div className="hidden lg:flex items-center gap-2">

            <a
              href="#about"
              className="btn btn-ghost btn-sm"
            >
              About Us
            </a>

            <a
              href="#gigs"
              className="btn btn-ghost btn-sm"
            >
              Available Gigs
            </a>

            <div className="dropdown dropdown-end">
              <label
                tabIndex={0}
                className="btn btn-ghost btn-sm"
              >
                Our Platforms
                <svg
                  className="fill-current w-4 h-4 ml-1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </label>
              <ul
                tabIndex={0}
                className="menu dropdown-content mt-3 z-50 p-3 shadow bg-base-100 rounded-box w-64 border border-base-300"
              >
                <li>
                  <a href="#platforms">
                    Browse Platforms
                  </a>
                </li>
                {platformsData.map(
                  (platform: any) => (
                    <li key={platform.id}>
                      <a
                        href={getPlatformUrl(platform.referral_url_template)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {platform.display_name || platform.name}
                      </a>
                    </li>
                  )
                )}
                <li>
                  <button
                    onClick={handleAccessPlatform}
                  >
                    Access My Platform
                  </button>
                </li>
              </ul>
            </div>

            <a
              href="#testimonials"
              className="btn btn-ghost btn-sm"
            >
              Gallery / Testimonials
            </a>

            <button
              onClick={handleSubmitAssignment}
              className="btn btn-ghost btn-sm"
            >
              Submit Assignment
            </button>

            {!user ? (
              <>
                <Link
                  to="/login"
                  className="btn btn-ghost btn-sm"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn btn-primary btn-sm"
                >
                  Register
                </Link>
              </>
            ) : (
              <button
                onClick={handleAccessPlatform}
                className="btn btn-primary btn-sm"
              >
                My Platform
              </button>
            )}

          </div>


          {/* MOBILE MENU */}

          <div className="dropdown dropdown-end lg:hidden">

              <button
                tabIndex={0}
                className="btn btn-square btn-ghost"
              >
                <Icon name="menu" className="w-5 h-5" />
              </button>

            <ul
              tabIndex={0}
              className="menu dropdown-content mt-3 z-50 p-3 shadow bg-base-100 rounded-box w-64 border border-base-300"
            >

              <li>
                <a href="#about">
                  About Us
                </a>
              </li>

              <li>
                <a href="#gigs">
                  Available Gigs
                </a>
              </li>

              <li>
                <a href="#platforms">
                  Our Platforms
                </a>
              </li>

              <li>
                <a href="#testimonials">
                  Gallery / Testimonials
                </a>
              </li>

              <li>
                <button
                  onClick={handleSubmitAssignment}
                >
                  Submit Assignment
                </button>
              </li>

              <li>
                <button
                  onClick={handleAccessPlatform}
                >
                  Access Platform
                </button>
              </li>

              {!user ? (
                <>
                  <li>
                    <Link to="/login">
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link to="/register">
                      Register
                    </Link>
                  </li>
                </>
              ) : (
                <li>
                  <button
                    onClick={handleAccessPlatform}
                  >
                    My Platform
                  </button>
                </li>
              )}

            </ul>

          </div>

        </div>

      </header>


      {/* =====================================================
          HERO
      ====================================================== */}

      <main>

        <section className="hero min-h-[75vh] bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10">

          <div className="hero-content max-w-7xl grid lg:grid-cols-2 gap-12 px-4 md:px-6 py-16">

            <div>

              <div className="badge badge-primary badge-outline mb-4">
                Professional Assignment Management
              </div>

              <h1 className="text-4xl md:text-6xl font-black leading-tight">

                Your Work.
                <br />

                <span className="text-primary">
                  Our Hustle.
                </span>

              </h1>

              <p className="py-6 text-lg text-base-content/75 max-w-2xl">
                Submit your project brief once.
                Our team reviews the requirements,
                matches you with qualified specialists,
                oversees progress and manages quality
                from start to finish.
              </p>


              {/* HERO BUTTONS */}

              <div className="flex flex-col sm:flex-row gap-3">

                <button
                  onClick={handleSubmitAssignment}
                  className="btn btn-primary btn-lg gap-2"
                >
                  <Icon name="document" className="w-5 h-5" />
                  Submit Assignment
                </button>

                <button
                  onClick={handleAccessPlatform}
                  className="btn btn-outline btn-lg gap-2"
                >
                  <Icon name="monitor" className="w-5 h-5" />
                  Access Platform
                </button>

                <button
                  onClick={handleViewGigs}
                  className="btn btn-ghost btn-lg gap-2"
                >
                  <Icon name="briefcase" className="w-5 h-5" />
                  View Gigs
                </button>

              </div>


              <div className="mt-6 flex flex-wrap gap-2 text-sm text-base-content/70">

                <span className="badge badge-ghost">
                  No bidding
                </span>

                <span className="badge badge-ghost">
                  Expert Reviewed
                </span>

                <span className="badge badge-ghost">
                  Status Tracking
                </span>

                <span className="badge badge-ghost">
                  Managed Quality
                </span>

              </div>

            </div>


            {/* SNAPSHOT CARD */}

            <div className="card bg-base-100 shadow-2xl border border-base-300">

              <div className="card-body space-y-4">

                <h2 className="card-title">
                  Assignment Dashboard
                </h2>

                <div className="rounded-box bg-base-200 p-4">

                  <div className="font-bold">
                    Logo Design for Coffee Shop
                  </div>

                  <div className="text-sm opacity-70">
                    Design • Budget $150 • Due in 7 days
                  </div>

                  <div className="mt-3 flex items-center gap-2">

                    <span className="badge badge-warning">
                      Pending Review
                    </span>

                    <span className="text-sm">
                      Admin checking brief
                    </span>

                  </div>

                </div>


                <div className="steps steps-vertical lg:steps-horizontal w-full">

                  <div className="step step-primary">
                    Submit
                  </div>

                  <div className="step step-primary">
                    Assign
                  </div>

                  <div className="step">
                    Work
                  </div>

                  <div className="step">
                    Approve
                  </div>

                </div>


                <div className="grid grid-cols-3 gap-3 text-center">

                  <div className="stat bg-base-200 rounded-box p-3">

                    <div className="stat-title text-xs">
                      Pending
                    </div>

                    <div className="stat-value text-xl">
                      3
                    </div>

                  </div>

                  <div className="stat bg-base-200 rounded-box p-3">

                    <div className="stat-title text-xs">
                      In Progress
                    </div>

                    <div className="stat-value text-xl">
                      2
                    </div>

                  </div>

                  <div className="stat bg-base-200 rounded-box p-3">

                    <div className="stat-title text-xs">
                      Complete
                    </div>

                    <div className="stat-value text-xl">
                      15
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            GALLERY / TESTIMONIALS
        ====================================================== */}

        <section
          id="testimonials"
          className="bg-base-200 py-16"
        >

          <div className="max-w-7xl mx-auto px-4 md:px-6">

            <div className="text-center max-w-3xl mx-auto mb-10">

              <h2 className="text-3xl md:text-4xl font-black">
                Gallery / Testimonials
              </h2>

              <p className="mt-3 text-base-content/70">
                See what our clients and specialists say
                about working with Bits Hustle Hub.
              </p>

            </div>


            <div className="grid md:grid-cols-3 gap-6">

              {testimonials.map(
                (testimonial) => (
                  <div
                    key={testimonial.name}
                    className="card bg-base-100 border border-base-300 shadow-sm"
                  >
                    <div className="card-body">
                      <div className="mb-2">
                        <Icon name="chat" className="w-8 h-8 text-primary" />
                      </div>
                      <p className="text-base-content/80 italic">
                        "{testimonial.text}"
                      </p>
                      <div className="mt-4 font-bold">
                        {testimonial.name}
                      </div>
                      <div className="text-sm text-base-content/70">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                )
              )}

            </div>

          </div>

        </section>


        {/* =====================================================
            ASSIGNMENT MODAL
        ====================================================== */}

        <section
          id="gigs"
          className="max-w-7xl mx-auto px-4 md:px-6 py-16"
        >

          <div className="text-center max-w-3xl mx-auto mb-10">

            <h2 className="text-3xl md:text-4xl font-black">
              What Would You Like To Do?
            </h2>

            <p className="mt-3 text-base-content/70">
              Everything you need to manage assignments,
              access opportunities and use the Bits Hustle Hub
              platform.
            </p>

          </div>


          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">


            {/* ABOUT */}

            <div
              id="about"
              className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-lg transition"
            >

                <div className="card-body">

                  <div className="mb-2">
                    <Icon name="info" className="w-8 h-8 text-primary" />
                  </div>

                <h3 className="font-bold text-xl">
                  About Us
                </h3>

                <p className="text-sm text-base-content/70">
                  Learn how Bits Hustle Hub connects
                  clients, specialists and opportunities
                  through a managed platform.
                </p>

                <div className="card-actions mt-auto">

                  <a
                    href="#how-it-works"
                    className="btn btn-outline btn-sm"
                  >
                    Learn More
                  </a>

                </div>

              </div>

            </div>


            {/* SUBMIT */}

              <div className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-lg transition">

                <div className="card-body">

                  <div className="mb-2">
                    <Icon name="document" className="w-8 h-8 text-primary" />
                  </div>

                <h3 className="font-bold text-xl">
                  Submit Assignment
                </h3>

                <p className="text-sm text-base-content/70">
                  Tell us what you need and our team
                  will review your brief and manage
                  the assignment.
                </p>

                <div className="card-actions mt-auto">

                  <button
                    onClick={handleSubmitAssignment}
                    className="btn btn-primary btn-sm"
                  >
                    Submit Now
                  </button>

                </div>

              </div>

            </div>


            {/* PLATFORM */}

            <div className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-lg transition">

              <div className="card-body">

                <div className="mb-2">
                  <Icon name="monitor" className="w-8 h-8 text-primary" />
                </div>

                <h3 className="font-bold text-xl">
                  Access Platform
                </h3>

                <p className="text-sm text-base-content/70">
                  Access your role-specific dashboard,
                  assignments, tasks, gigs and account.
                </p>

                <div className="card-actions mt-auto">

                  <button
                    onClick={handleAccessPlatform}
                    className="btn btn-primary btn-sm"
                  >
                    Access Platform
                  </button>

                </div>

              </div>

            </div>


            {/* GIGS */}

            <div className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-lg transition">

              <div className="card-body">

                <div className="mb-2">
                  <Icon name="briefcase" className="w-8 h-8 text-primary" />
                </div>

                <h3 className="font-bold text-xl">
                  View Gigs
                </h3>

                <p className="text-sm text-base-content/70">
                  View your available assignments and
                  manage your current gig activities.
                </p>

                <div className="card-actions mt-auto">

                  <button
                    onClick={handleViewGigs}
                    className="btn btn-outline btn-sm"
                  >
                    View Gigs
                  </button>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            OUR PLATFORMS
        ====================================================== */}

        <section
          id="platforms"
          className="bg-base-200 py-16"
        >

          <div className="max-w-7xl mx-auto px-4 md:px-6">

            <div className="text-center max-w-3xl mx-auto mb-10">

              <h2 className="text-3xl md:text-4xl font-black">
                Our Platforms
              </h2>

              <p className="mt-3 text-base-content/70">
                Choose the right platform for your needs.
                Each platform is designed for a specific
                role and workflow.
              </p>

            </div>


            {platformsData.length === 0 ? (
              <div className="text-center text-base-content/70">
                <p>Platforms will be listed here once configured.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">

                {platformsData.map(
                  (platform: any) => (
                    <div
                      key={platform.id}
                      id={`platform-${platform.id}`}
                      className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-lg transition"
                    >
                      <div className="card-body">
                        <div className="mb-2">
                          {platform.logo_url || platform.logoUrl ? (
                            <img src={platform.logo_url || platform.logoUrl} alt={platform.display_name || platform.name} className="w-10 h-10 object-contain rounded" />
                          ) : (
                            <Icon name="monitor" className="w-8 h-8 text-primary" />
                          )}
                        </div>
                        <h3 className="font-bold text-xl">
                          {platform.display_name || platform.name}
                        </h3>
                        {platform.description && (
                          <p className="text-sm text-base-content/70">
                            {platform.description}
                          </p>
                        )}
                        {!platform.description && (
                          <p className="text-sm text-base-content/70">
                            Access this platform to manage your
                            assignments, tasks, and account.
                          </p>
                        )}
                        <div className="card-actions mt-auto">
                          <a
                            href={getPlatformUrl(platform.referral_url_template)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-primary btn-sm"
                          >
                            Access Platform
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                )}

              </div>
            )}

          </div>

        </section>


        {/* =====================================================
            HOW IT WORKS
        ====================================================== */}

        <section
          id="how-it-works"
          className="max-w-7xl mx-auto px-4 md:px-6 py-16"
        >

          <div className="text-center max-w-3xl mx-auto mb-10">

            <h2 className="text-3xl md:text-4xl font-black">
              How It Works
            </h2>

            <p className="mt-3 text-base-content/70">
              A streamlined managed workflow designed
              for clients seeking professional results.
            </p>

          </div>


          <div className="grid md:grid-cols-4 gap-4">

            {steps.map(
              ([title, description], index) => (

                <div
                  key={title}
                  className="card bg-base-100 border border-base-300 shadow-sm"
                >

                  <div className="card-body">

                    <div className="badge badge-primary w-fit">
                      Step {index + 1}
                    </div>

                    <h3 className="font-bold text-lg">
                      {title}
                    </h3>

                    <p className="text-sm text-base-content/70">
                      {description}
                    </p>

                  </div>

                </div>

              )
            )}

          </div>

        </section>


        {/* =====================================================
            CATEGORIES
        ====================================================== */}

        <section className="bg-base-200 py-16">

          <div className="max-w-7xl mx-auto px-4 md:px-6 grid lg:grid-cols-2 gap-10 items-center">

            <div>

              <h2 className="text-3xl md:text-4xl font-black">
                Submit Various Types of Work
              </h2>

              <p className="mt-4 text-base-content/70">
                From creative projects to research and
                administrative tasks, your request is
                reviewed by our team and assigned to a
                qualified specialist.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">

                {categories.map(
                  (category: string) => (

                    <span
                      key={category}
                      className="badge badge-lg badge-outline"
                    >
                      {category}
                    </span>

                  )
                )}

              </div>

            </div>


            <div className="grid sm:grid-cols-2 gap-4">

              <div className="card bg-base-100 border border-base-300">

                <div className="card-body">

                  <h3 className="font-bold">
                    For Clients
                  </h3>

                  <p className="text-sm opacity-70">
                    Upload files, track progress,
                    communicate for clarifications,
                    and access invoices.
                  </p>

                </div>

              </div>


              <div className="card bg-base-100 border border-base-300">

                <div className="card-body">

                  <h3 className="font-bold">
                    Managed Quality
                  </h3>

                  <p className="text-sm opacity-70">
                    Our team assigns specialists,
                    reviews submissions and manages
                    deliverables.
                  </p>

                </div>

              </div>


              <div className="card bg-base-100 border border-base-300">

                <div className="card-body">

                  <h3 className="font-bold">
                    Private by Design
                  </h3>

                  <p className="text-sm opacity-70">
                    Clients access only their own
                    assignments and private project
                    information.
                  </p>

                </div>

              </div>


              <div className="card bg-base-100 border border-base-300">

                <div className="card-body">

                  <h3 className="font-bold">
                    Clear Tracking
                  </h3>

                  <p className="text-sm opacity-70">
                    Each assignment includes status
                    updates, timelines, files,
                    messages and deliverables.
                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            CTA
        ====================================================== */}

        <section className="max-w-5xl mx-auto px-4 md:px-6 py-16 text-center">

          <h2 className="text-3xl md:text-4xl font-black">
            Ready to Get Started?
          </h2>

          <p className="mt-4 text-base-content/70">
            Submit your project brief or access your
            Bits Hustle Hub platform.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">

            <button
              onClick={handleSubmitAssignment}
              className="btn btn-primary btn-lg"
            >
              Submit Assignment
            </button>

            <button
              onClick={handleAccessPlatform}
              className="btn btn-outline btn-lg"
            >
              Access Platform
            </button>

          </div>

        </section>

      </main>


      {/* =====================================================
          ASSIGNMENT MODAL
      ====================================================== */}

      {openModal && (

        <div className="modal modal-open">

          <div className="modal-box max-w-3xl">

            <div className="flex justify-between items-center mb-4">

              <div>

                <h3 className="font-bold text-xl">
                  Submit Your Assignment
                </h3>

                <p className="text-sm opacity-70">
                  No account required.
                </p>

              </div>

              <button
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  setOpenModal(false)
                }
              >
                <Icon name="x" className="w-4 h-4" />
              </button>

            </div>


            <form
              className="space-y-4"
              onSubmit={onSubmit}
            >

              <div className="grid md:grid-cols-2 gap-4">

                {/* TITLE */}

                <input
                  className="input input-bordered w-full"
                  placeholder="Assignment title"
                  value={form.title}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      title: event.target.value,
                    })
                  }
                  required
                />


                {/* CATEGORY */}

                <select
                  className="select select-bordered w-full"
                  value={form.category}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category: event.target.value,
                    })
                  }
                  required
                >

                  <option value="">
                    Select category
                  </option>

                  {categories.map(
                    (category: string) => (

                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>

                    )
                  )}

                </select>


                {/* DESCRIPTION */}

                <textarea
                  className="textarea textarea-bordered md:col-span-2"
                  placeholder="Describe what you need, deliverables, and specific requirements..."
                  rows={5}
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description:
                        event.target.value,
                    })
                  }
                  required
                />


                {/* BUDGET */}

                <input
                  className="input input-bordered w-full"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Budget (USD)"
                  value={form.budget}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      budget: event.target.value,
                    })
                  }
                  required
                />


                {/* DEADLINE */}

                <input
                  className="input input-bordered w-full"
                  type="date"
                  value={form.deadline}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      deadline:
                        event.target.value,
                    })
                  }
                  required
                />


                {/* PRIORITY */}

                <select
                  className="select select-bordered w-full"
                  value={form.priority}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      priority:
                        event.target.value,
                    })
                  }
                  required
                >

                  {priorities.map(
                    (priority) => (

                      <option
                        key={priority}
                        value={priority}
                      >
                        {priority} priority
                      </option>

                    )
                  )}

                </select>


                {/* NAME */}

                <input
                  className="input input-bordered w-full"
                  placeholder="Your name"
                  value={form.client_name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      client_name:
                        event.target.value,
                    })
                  }
                  required
                />


                {/* EMAIL */}

                <input
                  className="input input-bordered w-full"
                  type="email"
                  placeholder="Your email"
                  value={form.client_email}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      client_email:
                        event.target.value,
                    })
                  }
                  required
                />


                {/* PHONE */}

                <input
                  className="input input-bordered w-full"
                  type="tel"
                  placeholder="Your phone (optional)"
                  value={form.client_phone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      client_phone:
                        event.target.value,
                    })
                  }
                />


                {/* URLS */}

                <input
                  className="input input-bordered w-full"
                  placeholder="Reference URLs, comma separated"
                  value={form.files}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      files: event.target.value,
                    })
                  }
                />


                {/* FILES */}

                <input
                  className="file-input file-input-bordered md:col-span-2 w-full"
                  type="file"
                  multiple
                  onChange={(event) =>
                    setBriefFiles(
                      event.target.files
                    )
                  }
                />


                {/* SUBMIT */}

                <div className="md:col-span-2">

                  <button
                    className="btn btn-primary btn-lg"
                    type="submit"
                    disabled={
                      createMutation.isPending
                    }
                  >

                    {createMutation.isPending
                      ? 'Submitting...'
                      : 'Submit Request'}

                  </button>

                  <p className="text-sm text-base-content/70 mt-2">
                    Our team will review your
                    request and assign the
                    appropriate specialist.
                  </p>

                </div>

              </div>

            </form>

          </div>


          <div
            className="modal-backdrop"
            onClick={() =>
              setOpenModal(false)
            }
          />

        </div>

      )}


      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="footer footer-center bg-neutral text-neutral-content p-8">

        <aside>

          <p className="font-bold text-lg">
            Bits Hustle Hub
          </p>

          <p>
            Professional assignment management
            and gig platform.
          </p>

          <p className="opacity-60">
            © 2026 Bits Hustle Hub. All rights reserved.
          </p>

        </aside>

      </footer>

    </div>
  );
}