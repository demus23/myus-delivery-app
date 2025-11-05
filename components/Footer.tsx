// components/Footer.tsx
export default function Footer() {
  return (
    <footer className="mt-4 pt-4 pb-2 text-center text-secondary border-top">
      <div className="mb-1">
        &copy; {new Date().getFullYear()} LastMileX Delivery. All rights reserved.
        <span className="mx-2">|</span>
        <a href="/about" className="text-secondary me-2">About Us</a>
        <span className="mx-1">|</span>
        <a href="/privacy" className="text-secondary me-2">Privacy</a>
        <span className="mx-1">|</span>
        <a href="mailto:support@lastmilex.com" className="text-primary me-2">Support</a>
        <span className="mx-1">|</span>
        <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" className="text-secondary me-2">
          <i className="bi bi-twitter-x"></i>
        </a>
        <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" className="text-secondary me-2">
          <i className="bi bi-facebook"></i>
        </a>
        <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className="text-secondary me-2">
          <i className="bi bi-instagram"></i>
        </a>
        <a href="https://wa.me/971501234567" target="_blank" rel="noopener noreferrer" className="text-secondary">
          <i className="bi bi-whatsapp"></i>
        </a>
      </div>
      <div style={{ fontSize: 13, marginTop: 4 }}>
        Powered by your team &amp; ChatGPT 💡
      </div>
    </footer>
  );
}
