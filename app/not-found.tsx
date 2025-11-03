export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center font-serif">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">
          Did you see a ghost? Because it's not here.
        </h2>
        <p className="text-muted-foreground mb-6">
          The page you're looking for doesn't exist.
        </p>
      </div>
    </div>
  );
}
