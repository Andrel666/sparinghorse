// A page that isn't built yet: says so and links to the same content in Classic.
import { CLASSIC, type PageDef } from "../lib/pages";
import { PageHead, State } from "../components/ui";

export function NotYet({ page }: { page: PageDef }) {
  return (
    <div className="page">
      <PageHead title={page.label} />
      <State>
        <p><b>{page.label} is coming next in the new UI.</b></p>
        {page.classic && <p><a className="btn" href={`${CLASSIC}${page.classic}`}>Open {page.label} in Classic</a></p>}
      </State>
    </div>
  );
}
