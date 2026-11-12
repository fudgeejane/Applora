import { useEffect, useState } from "react";
import { useStyle } from "/src/components/ui/Style.jsx";
import Logo from "../assets/Logo.png";

const navigationEntry = window.performance.getEntriesByType("navigation")[0];
const isReloadNavigation = navigationEntry?.type === "reload";

function LoadingPage() {

  const style = useStyle();

  const [isPageLoaded, setIsPageLoaded] = useState(
    document.readyState === "complete"
  );
  const [hasMinimumDisplayTimeElapsed, setHasMinimumDisplayTimeElapsed] =
    useState(false);

  useEffect(() => {
    if (!isReloadNavigation) return undefined;

    const timeoutId = window.setTimeout(
      () => setHasMinimumDisplayTimeElapsed(true),
      1000
    );
    const handleLoad = () => setIsPageLoaded(true);

    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad, { once: true });
    }

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("load", handleLoad);
    };
  }, []);

  if (
    !isReloadNavigation ||
    (hasMinimumDisplayTimeElapsed && isPageLoaded)
  ) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Refreshing Applora"
      className={`fixed inset-0 z-[10000] grid min-h-dvh place-items-center overflow-hidden ${style.primaryBg} `}
    >
     
      <div className="relative flex flex-col items-center gap-5">
          <img src={Logo} alt="Applora Logo" className="h-16s w-auto p-4" />
        <div className="text-center">
          <p className="text-lg font-semibold tracking-wide">Applora</p>        </div>
      </div>
    </div>
  );
}

export default LoadingPage;
