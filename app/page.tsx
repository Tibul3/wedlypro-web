import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Wedly Pro",
  description: "Client management software for wedding professionals",
};


export default function HomePage() {
  return (
    <section className="home">
      <h1>Wedly Pro</h1>
      <p className="lead">
        An elegant client management app for wedding professionals. We’re getting things ready.
      </p>

      <div className="card">
        <h2>Useful links</h2>
        <ul>
          <li>
            <Link href="/privacy">Privacy Policy</Link>
          </li>
          <li>
            <Link href="/terms">Terms and Conditions</Link>
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>Contact</h2>
        <p className="muted">
          Support:{" "}
          <a href="mailto:support@wedlypro.com">support@wedlypro.com</a>
        </p>
      </div>

      <p className="muted small">
        This site will expand with FAQs, product info, and resources as Wedly Pro launches.
      </p>
    </section>
  );
}
