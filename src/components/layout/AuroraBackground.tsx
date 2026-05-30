/**
 * AuroraBackground — fondo fijo de toda la app.
 *
 * Renderiza 3 SVG paths onduladas (Q-curves) con stroke-width grande y
 * Gaussian blur fuerte, simulando bandas de aurora boreal cálida (amber,
 * coral, magenta) cruzando la pantalla. Vive como capa fija detrás de
 * todo (z-index -1, position fixed, inset 0).
 *
 * Decisión visual: bandas LÍNEA (no blobs circulares). Cero formas
 * concéntricas; los strokes son trazos continuos de borde a borde con
 * blur intenso que crea el efecto de luz difusa.
 *
 * Por qué SVG en vez de CSS gradients:
 * - Las curvas suaves Q (cuadráticas) no se pueden hacer con CSS puro.
 * - Gaussian blur SVG da una difusión más suave que el CSS blur sobre
 *   gradientes (que tienden a crear bandas duras).
 * - El componente es server-renderizable (no requiere JS en el cliente).
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        background:
          "linear-gradient(180deg, #18091a 0%, #0a0408 100%)",
      }}
    >
      <svg
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Blur fuerte para difundir las líneas como aurora */}
          <filter
            id="aurora-blur"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="60" />
          </filter>
        </defs>
        <g filter="url(#aurora-blur)" opacity="0.7">
          {/* Banda amber — alta, ondulada suave */}
          <path
            d="M -100 280 Q 350 150 800 320 T 1700 360"
            stroke="rgba(255, 179, 71, 0.65)"
            strokeWidth="90"
            fill="none"
            strokeLinecap="round"
          />
          {/* Banda coral — media, ondulada más pronunciada */}
          <path
            d="M -100 520 Q 400 380 850 560 T 1700 580"
            stroke="rgba(255, 107, 107, 0.55)"
            strokeWidth="110"
            fill="none"
            strokeLinecap="round"
          />
          {/* Banda magenta — baja, ondulada suave */}
          <path
            d="M -100 780 Q 500 640 1000 800 T 1700 820"
            stroke="rgba(255, 61, 139, 0.45)"
            strokeWidth="90"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
