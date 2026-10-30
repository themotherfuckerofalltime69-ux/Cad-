import { toggleFullscreen } from "@/lib/cad/store";

export function Landing({
  leaving,
  onProceed,
}: {
  leaving: boolean;
  onProceed: () => void;
}) {
  return (
    <>
      <div className="bg-hero" />
      <div className={leaving ? "container leaving" : "container enter"} id="landingContainer">
        <header>
          <div className="logo-tag">
            <span className="sparkle">+</span>// Code at the Speed of Thoughts //
          </div>
          <div className="header-right">
            <button
              type="button"
              className="fullscreen-btn"
              id="fullscreenBtn"
              title="Toggle Fullscreen"
              onClick={toggleFullscreen}
            >
              <span>[FS]</span> Fullscreen
            </button>
          </div>
        </header>

        <main className="main-content">
          <div className="title-section">
            <h1 className="brand-title">Typeless</h1>
            <div className="sub-title">Code at the Speed of Thoughts</div>
            <button type="button" className="proceed-btn" id="proceedBtn" onClick={onProceed}>
              Proceed <span className="sparkle">>></span>
            </button>
          </div>

          <div className="info-card">
            <p className="info-text">
              Futuristic sans-serif display interface featuring wide proportions, sharp geometric
              angles, and subtle diagonal cutouts.
            </p>
          </div>
        </main>

        <footer>
          <div>Otf & Ttf</div>
          <div className="footer-center">Multilingual Support</div>
          <div>&copy; 2026</div>
        </footer>
      </div>
    </>
  );
}
