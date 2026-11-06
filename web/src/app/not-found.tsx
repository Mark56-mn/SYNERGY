import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-4 py-12 text-center sm:px-5">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">
        404
      </p>
      <h1 className="mt-2 text-2xl font-bold text-ink">
        This page is not here
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-muted">
        The link may be mistyped, or the profile or community may be a
        demonstration record that does not exist in this build.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 text-sm font-semibold text-bg hover:bg-primary-hover"
      >
        Back to the feed
      </Link>
    </div>
  );
}
