import Link from 'next/link';

/**
 * A simple navigation component providing links to common pages.  This
 * component is not automatically included anywhere; import it in your
 * layout or page components as needed.
 */
export default function Nav() {
  return (
    <nav className="py-4 border-b">
      <ul className="flex gap-4 justify-start items-center px-4">
        <li>
          <Link href="/">Home</Link>
        </li>
        <li>
          <Link href="/billing">Billing</Link>
        </li>
        <li>
          <Link href="/legal">Legal</Link>
        </li>
      </ul>
    </nav>
  );
}