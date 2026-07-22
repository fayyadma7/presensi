export default function Footer() {
  return (
    <footer className="w-full py-4 text-center text-xs text-muted-foreground border-t border-border/30 mb-[72px] md:mb-0">
      <p>
        &copy; {new Date().getFullYear()}{" "}
        <span className="font-bold text-foreground/80">Fayyad Malik Abdillah</span>. All rights reserved.
      </p>
    </footer>
  );
}
