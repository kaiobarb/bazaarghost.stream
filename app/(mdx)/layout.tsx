import Navbar from "@/components/navbar";

export default function MdxLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <article className="prose prose-neutral dark:prose-invert lg:prose-md max-w-none font-serif">
          {children}
        </article>
      </div>
    </>
  );
}
