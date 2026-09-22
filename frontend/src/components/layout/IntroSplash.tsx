export function IntroSplash() {
  return (
    <div className="intro-splash" aria-hidden="true">
      <div className="intro-splash__glow" />
      <div className="intro-splash__content">
        <img className="intro-splash__logo" src="/logo-latorre.png" alt="" width={180} height={90} />
        <span className="intro-splash__line" />
      </div>
    </div>
  );
}