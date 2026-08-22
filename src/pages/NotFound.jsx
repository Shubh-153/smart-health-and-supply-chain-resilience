import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="p-8 border border-rule bg-card rounded-lg max-w-xl text-center mx-auto mt-12">
      <h2 className="text-xl font-display font-semibold text-ink mb-2">Page Not Found</h2>
      <p className="text-ink-soft mb-6">
        The route you requested doesn't match any known page.
      </p>
      <Link to="/" className="inline-flex items-center justify-center px-4 py-2 bg-ink text-paper rounded font-medium hover:bg-ink-soft transition-colors">
        Return to National Dashboard
      </Link>
    </div>
  );
}
