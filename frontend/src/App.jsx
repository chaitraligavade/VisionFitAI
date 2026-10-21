
import { useEffect, useState } from "react";
import "./App.css";

import {
  checkBackend,
  fetchClothes,
  getAssetUrl,
  getTryOnStreamUrl,
  startTryOn,
  stopTryOn,
} from "./api";

const collections = [
  {
    name: "Everyday Essentials",
    category: "CASUAL WEAR",
    description: "Effortless styles for every day.",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Modern Classics",
    category: "SMART & CHIC",
    description: "Timeless looks, reimagined.",
    image:
      "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Street Style",
    category: "URBAN FASHION",
    description: "Make your own statement.",
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=85",
  },
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [clothingItems, setClothingItems] = useState([]);
  const [clothingError, setClothingError] = useState("");
  const [selectedClothing, setSelectedClothing] = useState(null);

  const [tryOnActive, setTryOnActive] = useState(false);
  const [tryOnLoading, setTryOnLoading] = useState(false);
  const [tryOnError, setTryOnError] = useState("");
  const [cart, setCart] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const health = await checkBackend();

        if (!active) return;

        setBackendStatus(
          health.status === "online" ? "online" : "offline"
        );

        const result = await fetchClothes();

        if (!active) return;

        setClothingItems(result.items || []);
        setClothingError("");
      } catch (error) {
        if (!active) return;

        setBackendStatus("offline");
        setClothingError(error.message);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      // Best-effort cleanup when the page is unmounted.
      // The Stop Camera button is the primary way to stop the webcam.
      if (tryOnActive) {
        stopTryOn().catch(() => {});
      }
    };
  }, [tryOnActive]);

  function goToTryOn() {
    document.getElementById("try-on")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  async function enterFittingRoom() {
    if (backendStatus !== "online") {
      setTryOnError("Please start the VisionFitAI backend first.");
      return;
    }

    if (clothingItems.length === 0) {
      setTryOnError(
        "No clothing images were found. Add images to your assets folder first."
      );
      return;
    }

    const index = selectedClothing
      ? clothingItems.findIndex(
          (item) => item.image === selectedClothing.image
        )
      : 0;

    setTryOnLoading(true);
    setTryOnError("");

    try {
      await startTryOn(Math.max(index, 0));
      setTryOnActive(true);
    } catch (error) {
      setTryOnError(error.message);
      setTryOnActive(false);
    } finally {
      setTryOnLoading(false);
    }
  }

  async function stopFittingRoom() {
    setTryOnLoading(true);
    setTryOnError("");

    try {
      await stopTryOn();
      setTryOnActive(false);
    } catch (error) {
      setTryOnError(error.message);
    } finally {
      setTryOnLoading(false);
    }
  }

  async function selectClothing(item) {
    setSelectedClothing(item);
    setTryOnError("");

    if (!tryOnActive) {
      return;
    }

    const index = clothingItems.findIndex(
      (clothing) => clothing.image === item.image
    );

    if (index < 0) {
      setTryOnError("This clothing item could not be selected.");
      return;
    }

    try {
      await startTryOn(index);
    } catch (error) {
      setTryOnError(error.message);
    }
  }

  function addToCart(item) {
    setCart((currentCart) => {
      if (currentCart.some((existing) => existing.image === item.image)) {
        return currentCart;
      }

      return [...currentCart, item];
    });
  }

  function removeFromCart(item) {
    setCart((currentCart) =>
      currentCart.filter((existing) => existing.image !== item.image)
    );
  }

  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="#home" aria-label="VisionFitAI home">
          <span className="brand-icon">V</span>
          <span>
            visionfit<span className="brand-ai">AI</span>
          </span>
        </a>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          ☰
        </button>

        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <a href="#home" onClick={() => setMenuOpen(false)}>
            Home
          </a>
          <a href="#collections" onClick={() => setMenuOpen(false)}>
            Collections
          </a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
            How it works
          </a>
          <button
            className="nav-cta"
            onClick={() => {
              setMenuOpen(false);
              goToTryOn();
            }}
          >
            Try it on ↗
          </button>
        </nav>
      </header>

      <div className="backend-status">
        <span
          className={`backend-dot ${
            backendStatus === "online" ? "connected" : ""
          }`}
        />
        Backend:{" "}
        {backendStatus === "checking"
          ? "Connecting..."
          : backendStatus === "online"
            ? "Connected"
            : "Offline"}
      </div>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="status-dot" />
              THE FUTURE OF ONLINE FASHION
            </div>

            <h1>
              Your style.
              <br />
              Your fit.
              <br />
              <span>Your reality.</span>
            </h1>

            <p className="hero-description">
              Meet your personal virtual fitting room. Explore styles,
              preview clothes, and discover your look before you buy.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={goToTryOn}
              >
                Start virtual try-on <span>↗</span>
              </button>

              <a className="secondary-button" href="#collections">
                Explore collections ↓
              </a>
            </div>

            <div className="hero-note">
              <span className="live-indicator" />
              Powered by real-time body tracking
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-image">
              <img
                src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1100&q=90"
                alt="Contemporary fashion inspiration"
              />

              <div className="image-label">
                <span className="label-symbol">✳</span>
                <div>
                  <strong>Your look, reimagined.</strong>
                  <small>Discover your next favourite</small>
                </div>
              </div>
            </div>

            <div className="floating-card">
              <span className="floating-icon">✦</span>
              <div>
                <strong>Style without limits</strong>
                <p>Try something new today.</p>
              </div>
            </div>

            <div className="circle-decoration">VF</div>
          </div>
        </section>

        <section className="benefits" id="how-it-works">
          <div className="benefit">
            <span className="benefit-number">01</span>
            <div>
              <strong>Choose your style</strong>
              <p>Explore clothing from your collection.</p>
            </div>
          </div>

          <div className="benefit">
            <span className="benefit-number">02</span>
            <div>
              <strong>Step in front of the camera</strong>
              <p>Let body tracking follow your movement.</p>
            </div>
          </div>

          <div className="benefit">
            <span className="benefit-number">03</span>
            <div>
              <strong>Discover your look</strong>
              <p>Preview your outfit in the virtual room.</p>
            </div>
          </div>
        </section>

        <section className="collections-section" id="collections">
          <div className="section-heading">
            <div>
              <p className="section-kicker">FIND YOUR LOOK</p>
              <h2>
                Style starts <span>here.</span>
              </h2>
            </div>

            <p>
              Explore different moods, discover new favourites, and find
              a style that feels like you.
            </p>
          </div>

          {clothingError && (
            <p className="error-message" role="alert">
              Could not load the clothing catalogue: {clothingError}
            </p>
          )}

          {clothingItems.length > 0 ? (
            <>
              <p className="catalogue-count">
                {clothingItems.length} clothing image(s) found in your assets
              </p>

              <div className="collection-grid">
                {clothingItems.map((item) => {
                  const selected =
                    selectedClothing?.image === item.image;

                  const inCart = cart.some(
                    (cartItem) => cartItem.image === item.image
                  );

                  return (
                    <article
                      className={`collection-card ${
                        selected ? "selected-card" : ""
                      }`}
                      key={item.image}
                    >
                      <div className="collection-image">
                        <img
                          src={getAssetUrl(item.image)}
                          alt={item.name}
                          loading="lazy"
                        />

                        <span className="collection-category">
                          YOUR CATALOGUE
                        </span>

                        <button
                          className="collection-arrow"
                          onClick={() => {
                            selectClothing(item);
                            goToTryOn();
                          }}
                          aria-label={`Try ${item.name}`}
                        >
                          ↗
                        </button>
                      </div>

                      <div className="collection-info">
                        <div>
                          <h3>{item.name}</h3>
                          <p>
                            {selected
                              ? "Selected for virtual try-on"
                              : "Available in your clothing assets"}
                          </p>
                        </div>
                        <span className="collection-star">✳</span>
                      </div>

                      <div className="product-actions">
                        <button
                          className="small-button"
                          onClick={() => {
                            selectClothing(item);
                            goToTryOn();
                          }}
                        >
                          Try this
                        </button>

                        <button
                          className="small-button secondary-small-button"
                          onClick={() => addToCart(item)}
                          disabled={inCart}
                        >
                          {inCart ? "Added ✓" : "Add to cart"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {!clothingError && backendStatus === "online" && (
                <p className="catalogue-count">
                  No supported clothing images were found in the assets
                  folder. Add garment images to see your catalogue here.
                </p>
              )}

              <div className="collection-grid">
                {collections.map((item) => (
                  <article className="collection-card" key={item.name}>
                    <div className="collection-image">
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                      />
                      <span className="collection-category">
                        {item.category}
                      </span>
                      <button
                        className="collection-arrow"
                        onClick={goToTryOn}
                        aria-label={`Explore ${item.name}`}
                      >
                        ↗
                      </button>
                    </div>

                    <div className="collection-info">
                      <div>
                        <h3>{item.name}</h3>
                        <p>{item.description}</p>
                      </div>
                      <span className="collection-star">✳</span>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="tryon-banner" id="try-on">
          <div className="tryon-copy">
            <p className="section-kicker">YOUR VIRTUAL FITTING ROOM</p>

            <h2>
              Ready to see yourself
              <br />
              in a new style?
            </h2>

            <p>
              {selectedClothing
                ? `Selected item: ${selectedClothing.name}. `
                : "Choose an outfit to get started. "}
              Connect your camera to start your virtual fitting experience.
            </p>

            {tryOnError && (
              <p className="error-message" role="alert">
                {tryOnError}
              </p>
            )}

            {!tryOnActive ? (
              <button
                className="primary-button"
                onClick={enterFittingRoom}
                disabled={tryOnLoading}
              >
                {tryOnLoading
                  ? "Starting camera..."
                  : "Enter fitting room"}
                {!tryOnLoading && <span> ↗</span>}
              </button>
            ) : (
              <button
                className="primary-button stop-button"
                onClick={stopFittingRoom}
                disabled={tryOnLoading}
              >
                {tryOnLoading ? "Stopping..." : "Stop camera"}
              </button>
            )}

            {tryOnActive && (
              <p className="camera-status">
                <span className="live-indicator" />
                Camera session active
              </p>
            )}
          </div>

          <div className="tryon-preview">
            {tryOnActive ? (
              <img
                key={selectedClothing?.image || "default"}
                className="live-camera"
                src={getTryOnStreamUrl()}
                alt="Live camera preview with virtual clothing overlay"
              />
            ) : (
              <div className="tryon-mark" aria-hidden="true">
                <span>V</span>
                <span>F</span>
                <small>YOUR STYLE, YOUR WAY</small>
              </div>
            )}
          </div>
        </section>

        <section className="cart-section" id="cart">
          <div className="section-heading">
            <div>
              <p className="section-kicker">YOUR SELECTION</p>
              <h2>
                Your <span>cart.</span>
              </h2>
            </div>
            <p>
              {cart.length === 0
                ? "Your selected items will appear here."
                : `${cart.length} item(s) in your cart.`}
            </p>
          </div>

          {cart.length > 0 && (
            <div className="cart-grid">
              {cart.map((item) => (
                <article className="cart-item" key={item.image}>
                  <img src={getAssetUrl(item.image)} alt={item.name} />
                  <div className="cart-item-info">
                    <h3>{item.name}</h3>
                    <button
                      className="text-button"
                      onClick={() => removeFromCart(item)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <a className="brand" href="#home">
          <span className="brand-icon">V</span>
          <span>
            visionfit<span className="brand-ai">AI</span>
          </span>
        </a>

        <p>Discover your style. Experience the future.</p>
        <span className="copyright">© 2026 VisionFitAI</span>
      </footer>
    </div>
  );
}

export default App;
