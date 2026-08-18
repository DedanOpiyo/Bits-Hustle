import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'Bits Hustle Hub';
const SITE_URL = 'https://bitshustlehubs.co.ke';
const DEFAULT_IMAGE = '/og-image.svg';
const DEFAULT_DESCRIPTION =
  'Professional assignment management platform. Submit your project brief and get matched with vetted specialists. Managed quality, private by design.';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  schema?: Record<string, unknown>;
  noIndex?: boolean;
  breadcrumbs?: Array<{ name: string; item: string }>;
  language?: string;
  alternateLanguages?: Array<{ hreflang: string; href: string }>;
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  image = DEFAULT_IMAGE,
  type = 'website',
  schema,
  noIndex = false,
  breadcrumbs,
  language,
  alternateLanguages,
}: SEOProps) {
  const location = useLocation();
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const canonicalUrl = canonical || `${SITE_URL}${location.pathname}`;

  const pageSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: fullTitle,
    description,
    url: canonicalUrl,
    ...(image && { image: image.startsWith('http') ? image : `${SITE_URL}${image}` }),
  }), [fullTitle, description, canonicalUrl, image]);

  const organizationSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    logo: `${SITE_URL}/favicon.svg`,
  }), []);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      <link rel="canonical" href={canonicalUrl} />
      {language && <html lang={language} />}
      {alternateLanguages && alternateLanguages.map((alt) => (
        <link
          key={alt.hreflang}
          rel="alternate"
          hrefLang={alt.hreflang}
          href={alt.href}
        />
      ))}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta
        property="og:image"
        content={image.startsWith('http') ? image : `${SITE_URL}${image}`}
      />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta
        name="twitter:image"
        content={image.startsWith('http') ? image : `${SITE_URL}${image}`}
      />

      <script type="application/ld+json">
        {JSON.stringify(schema || pageSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbs.map((crumb, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: crumb.name,
              item: crumb.item,
            })),
          })}
        </script>
      )}
    </Helmet>
  );
}
