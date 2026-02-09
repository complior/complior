export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-4">
      <div className="container mx-auto flex items-center justify-between px-4 text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} AI Act Compliance Platform</p>
        <p>v0.1.0</p>
      </div>
    </footer>
  );
}
