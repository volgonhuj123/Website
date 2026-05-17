import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const VERT = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;

#define PI 3.1415927

float Hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}


#define WMUL iResolution.x/iResolution.y

void mainImage(out vec4 fragColor, in vec2 fragCoord) {

    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;


    
    vec3 col = vec3(0.0);

    float c = cos(iTime)*WMUL;
    float s = sin(iTime);

    float l = length(uv + 0.1 * vec2(c, s));

    uv *= 100.0;

    vec2 gv = fract(uv) - 0.5;
    vec2 id = floor(uv);

    float n = Hash21(id);

    float d = length(gv - (vec2(n, fract(n * 10.0)) - 0.5));

    float star = smoothstep(
        0.1,
        0.05,
        d * (10.0 + 5.0 * sin(iTime + n * 6.28))
    );

    col += star * n;

    l =( 1.0 - l);

    float t = iTime * 2.0;

    l = pow(10000.0, l) / 10000.0;

    vec4 colour = vec4(
        cos(t + l),
        cos(l + t + PI * 0.333),
        cos(l + t + 2.0 * PI * 0.333),
        1.0
    );

    fragColor =
        vec4(col, 1.0)
        + l * (colour+2.0)
        ;
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

function ShaderOverlay() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;

    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: false,
      alpha: true,
    });

    if (!gl) return;

    const program = gl.createProgram();

    gl.attachShader(
      program,
      compileShader(gl, gl.VERTEX_SHADER, VERT)
    );

    gl.attachShader(
      program,
      compileShader(gl, gl.FRAGMENT_SHADER, FRAG)
    );

    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,

        -1,  1,
         1, -1,
         1,  1
      ]),
      gl.STATIC_DRAW
    );

    const position = gl.getAttribLocation(program, "a_position");

    gl.enableVertexAttribArray(position);

    gl.vertexAttribPointer(
      position,
      2,
      gl.FLOAT,
      false,
      0,
      0
    );

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();

    window.addEventListener("resize", resize);

    const start = performance.now();

    let raf;

    const render = () => {
      const time = (performance.now() - start) / 1000;

      gl.uniform2f(
        gl.getUniformLocation(program, "iResolution"),
        canvas.width,
        canvas.height
      );

      gl.uniform1f(
        gl.getUniformLocation(program, "iTime"),
        time
      );

      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      raf = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
    />
  );
}

function getStarImage(temp) {
  if (temp === undefined || temp === null) return "/res/stars/unknown.png";
  if (temp >= 30000) return "/res/stars/uv.png";
  if (temp >= 10000) return "/res/stars/blue.png";
  if (temp >= 7500) return "/res/stars/white_blue.png";
  if (temp >= 6000) return "/res/stars/white.png";
  if (temp >= 5200) return "/res/stars/yellow.png";
  if (temp >= 3700) return "/res/stars/orange.png";

  return "/res/stars/red.png";
}

export default function MyAccount() {

  const navigate = useNavigate();

  const [stars, setStars] = useState([]);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  const [electricity, setElectricity] = useState(null);
  const [extremium, setExtremium] = useState(null);
  const [army, setArmy] = useState(null);
  const [cooldown, setCooldown] = useState(null);
  const [armyMsg, setArmyMsg] = useState(null);
  const [armyLoading, setArmyLoading] = useState(false);
  const [randomStar, setRandomStar] = useState(null);
  const [randomStarMsg, setRandomStarMsg] = useState(null);
  const [randomStarLoading, setRandomStarLoading] = useState(false);
  const pollRef = useRef(null);

  const token = localStorage.getItem("token");

  const fmt = (n) =>
    n == null ? "—" : Number(n).toFixed(2);

  const loadResources = async () => {
    try {
      const res = await fetch("/api/ressources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tok: token }),
      });

      if (res.ok) {
        const [extr, elec, arm, cd] = await res.json();

        setExtremium(extr);
        setElectricity(elec);
        setArmy(arm);
        setCooldown(cd);
      }
    } catch {}
  };

  useEffect(() => {

    if (!token) {
      navigate("/login");
      return;
    }

    (async () => {

      try {

        await loadResources();

        const res = await fetch("/api/my_account", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        if (res.status === 400) {
          navigate("/login");
          return;
        }

        if (!res.ok) {
          const d = await res.json().catch(() => ({}));

          setMsg(d.error || `Error ${res.status}`);

          return;
        }

        setStars(await res.json());

      } catch {
        setMsg("Server error");
      } finally {
        setLoading(false);
      }
    })();

    pollRef.current = setInterval(loadResources, 1000);

    return () => clearInterval(pollRef.current);

  }, []);
   const buyArmy = async () => {
    setArmyLoading(true);
    setArmyMsg(null);
    try {
      const res = await fetch("/api/buy_army", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tok: token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setArmyMsg({ ok: false, text: data.error || "Not enough resources" });
        return;
      }
      setArmyMsg({ ok: true, text: `+${data[1]} soldiers (spent ${Number(data[0]).toFixed(2)} each resource)` });
      await loadResources();
    } catch {
      setArmyMsg({ ok: false, text: "Server error" });
    } finally {
      setArmyLoading(false);
    }
  };
  const getRandomStar = async () => {
    setRandomStarLoading(true);
    setRandomStarMsg(null);
    try {
      const res = await fetch("/api/get_random_star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tok: token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRandomStarMsg({ ok: false, text: typeof data === "string" ? data : "Failed to get target" });
        return;
      }
      setRandomStar(data);
      setRandomStarMsg({ ok: true, text: `Target star assigned: #${data.star_id}` });
    } catch {
      setRandomStarMsg({ ok: false, text: "Server error" });
    } finally {
      setRandomStarLoading(false);
    }
  };


  const handleLogout = async () => {

    const tok = localStorage.getItem("token");

    if (tok) {
      await fetch(`/api/quit?tok=${tok}`).catch(() => {});
    }

    localStorage.removeItem("token");
    localStorage.removeItem("player_id");

    navigate("/");
  };

  return (
    <>
      <style>{`
      
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Exo+2:wght@300;400;500&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: #000;
          overflow-x: hidden;
          font-family: 'Exo 2', sans-serif;
        }
        .action-panel {
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-btn {

  border: 1px solid rgba(167,139,250,0.25);

  background:
    linear-gradient(
      135deg,
      rgba(120,80,255,0.18),
      rgba(255,255,255,0.04)
    );

  color: white;

  padding: 12px 18px;

  border-radius: 14px;

  cursor: pointer;

  font-family: 'Orbitron', monospace;

  letter-spacing: 0.08em;

  transition:
    transform 0.18s,
    box-shadow 0.18s,
    border-color 0.18s;

  backdrop-filter: blur(10px);
}

.panel-btn:hover {

  transform: translateY(-2px);

  border-color: #a78bfa;

  box-shadow:
    0 0 24px rgba(167,139,250,0.35);
}

.panel-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.panel-btn.atk {

  border-color: rgba(255,120,120,0.3);

  background:
    linear-gradient(
      135deg,
      rgba(255,80,80,0.15),
      rgba(255,255,255,0.03)
    );
}

.panel-msg {

  margin-top: 10px;

  padding: 12px 14px;

  border-radius: 12px;

  font-size: 0.82rem;

  letter-spacing: 0.05em;

  backdrop-filter: blur(10px);
}

.panel-msg.ok {

  background: rgba(80,255,140,0.08);

  border: 1px solid rgba(80,255,140,0.18);

  color: #9cffc2;
}

.panel-msg.err {

  background: rgba(255,80,80,0.08);

  border: 1px solid rgba(255,80,80,0.18);

  color: #ffb3b3;
}

.target-card {

  margin-top: 14px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 18px;

  padding: 0px 18px;

  border-radius: 18px;

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,0.04),
      rgba(255,255,255,0.02)
    );

  border: 1px solid rgba(255,255,255,0.06);

  backdrop-filter: blur(16px);
}

.target-label {

  color: rgba(220,220,255,0.45);

  text-transform: uppercase;

  letter-spacing: 0.16em;

  font-size: 0.68rem;
}

.target-id {

  color: white;

  font-family: 'Orbitron', monospace;

  letter-spacing: 0.08em;
}

.target-goto {

  text-decoration: none;

  color: #ffb3b3;

  font-family: 'Orbitron', monospace;

  border: 1px solid rgba(255,120,120,0.25);

  padding: 10px 14px;

  border-radius: 12px;

  transition: 0.2s;
}

.target-goto:hover {

  background: rgba(255,120,120,0.08);

  box-shadow:
    0 0 18px rgba(255,120,120,0.18);
}
        .page {
          position: relative;
          z-index: 2;
          width: 100%;
          min-height: 100vh;
          padding: 110px 24px 40px;
          max-width: 900px;
          margin: 0 auto;
        }

        .topbar {

          position: fixed;
          top: 0;
          left: 0;
          right: 0;

          height: 78px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 0 32px;

          z-index: 100;

          background: rgba(3,3,15,0.55);

          backdrop-filter: blur(14px);

          border-bottom: 1px solid rgba(120,80,255,0.15);
        }

        .logo {
          font-family: 'Orbitron', monospace;
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: 0.22em;
          color: white;

          text-shadow:
            0 0 18px rgba(120,80,255,0.8),
            0 0 40px rgba(120,80,255,0.4);
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .res-inline {
          display: flex;
          gap: 14px;
        }

        .res-item {

          min-width: 95px;

          padding: 10px 12px;

          border-radius: 12px;

          background: rgba(255,255,255,0.03);

          border: 1px solid rgba(255,255,255,0.05);

          backdrop-filter: blur(8px);
        }

        .res-label {

          display: block;

          margin-bottom: 5px;

          font-size: 0.58rem;

          text-transform: uppercase;

          letter-spacing: 0.18em;

          color: rgba(200,200,255,0.45);
        }

        .res-val {
          font-size: 0.88rem;
          font-weight: 600;
        }

        .elec { color: #7fd8ff; }
        .extr { color: #b5ff7f; }
        .army { color: #ff9d9d; }

        .logout-btn {

          border: 1px solid rgba(167,139,250,0.3);

          background: rgba(255,255,255,0.03);

          color: #c8c8ff;

          border-radius: 10px;

          padding: 11px 18px;

          cursor: pointer;

          font-family: 'Orbitron', monospace;

          letter-spacing: 0.12em;

          transition: 0.2s;
        }

        .logout-btn:hover {

          transform: translateY(-2px);

          border-color: #a78bfa;

          box-shadow:
            0 0 20px rgba(167,139,250,0.25);
        }

        .hero {

          margin-bottom: 42px;

          padding: 34px;

          border-radius: 26px;

          background:
            linear-gradient(
              135deg,
              rgba(120,80,255,0.14),
              rgba(0,0,0,0.2)
            );

          border: 1px solid rgba(255,255,255,0.08);

          backdrop-filter: blur(18px);

          box-shadow:
            0 0 50px rgba(120,80,255,0.12);
        }

        .hero-title {

          font-family: 'Orbitron', monospace;

          font-size: clamp(2rem, 5vw, 3.5rem);

          font-weight: 900;

          color: white;

          letter-spacing: 0.12em;

          margin-bottom: 12px;

          text-shadow:
            0 0 25px rgba(120,80,255,0.9),
            0 0 60px rgba(120,80,255,0.35);
        }

        .hero-sub {

          color: rgba(220,220,255,0.7);

          letter-spacing: 0.1em;

          line-height: 1.7;
        }

        .section-title {

          margin-bottom: 18px;

          color: rgba(200,200,255,0.55);

          font-size: 0.75rem;

          text-transform: uppercase;

          letter-spacing: 0.28em;
        }

        .list {
          display: grid;
          gap: 18px;
        }

        .star-row {

          display: flex;
          align-items: center;
          gap: 18px;

          padding: 18px;

          border-radius: 20px;

          text-decoration: none;

          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,0.04),
              rgba(255,255,255,0.02)
            );

          border: 1px solid rgba(255,255,255,0.06);

          backdrop-filter: blur(14px);

          transition:
            transform 0.18s,
            border-color 0.18s,
            box-shadow 0.18s;
        }

        .star-row:hover {

          transform: translateY(-4px);

          border-color: rgba(167,139,250,0.45);

          box-shadow:
            0 0 40px rgba(120,80,255,0.18);
        }

        .star-img {

          width: 68px;
          height: 68px;

          object-fit: contain;

          border-radius: 50%;

          padding: 6px;

          background: rgba(255,255,255,0.03);

          border: 1px solid rgba(255,255,255,0.06);
        }

        .star-info {
          flex: 1;
        }

        .star-name {

          color: white;

          font-size: 1rem;

          font-weight: 700;

          letter-spacing: 0.08em;

          margin-bottom: 6px;
        }

        .star-id {

          font-size: 0.72rem;

          color: rgba(200,200,255,0.35);

          margin-bottom: 6px;
        }

        .star-temp {

          font-size: 0.75rem;

          color: #a78bfa;
        }

        .star-arrow {

          color: rgba(200,200,255,0.35);

          font-size: 1.2rem;

          transition: 0.2s;
        }

        .star-row:hover .star-arrow {
          color: white;
          transform: translateX(4px);
        }

        .loading {

          display: flex;

          justify-content: center;

          gap: 10px;

          padding: 80px 0;
        }

        .dot {

          width: 10px;
          height: 10px;

          border-radius: 50%;

          background: #a78bfa;

          animation: pulse 1.2s infinite;
        }

        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes pulse {

          0%,100% {
            opacity: 0.2;
            transform: scale(0.8);
          }

          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        .msg-err {

          padding: 16px;

          border-radius: 14px;

          background: rgba(255,80,80,0.08);

          border: 1px solid rgba(255,80,80,0.2);

          color: #ffb3b3;

          margin-bottom: 20px;
        }

      `}</style>

      <ShaderOverlay />

      <div className="topbar">

        <div className="logo">
          UniConqueror
        </div>

        <div className="section-title">— actions —</div>
        <div className="action-panel">
          <button className="panel-btn" disabled={armyLoading} onClick={buyArmy}>
            {armyLoading ? "..." : "⚔ buy army"}
          </button>
          <button className="panel-btn atk" disabled={randomStarLoading} onClick={getRandomStar}>
            {randomStarLoading ? "..." : "🎲 get target star"}
          </button>
        </div>

        {armyMsg && <div className={`panel-msg ${armyMsg.ok ? "ok" : "err"}`}>{armyMsg.text}</div>}
        {randomStarMsg && <div className={`panel-msg ${randomStarMsg.ok ? "ok" : "err"}`}>{randomStarMsg.text}</div>}

        {randomStar && (
          <div className="target-card">
            <div>
              <span className="target-label">target → </span>
              <span className="target-id">star #{randomStar.star_id}</span>
            </div>
            <a
              className="target-goto"
              href="/star"
              onClick={() => localStorage.setItem("star_id", String(randomStar.star_id))}
            >attack ▶</a>
          </div>
        )}


        <div className="topbar-right">

          <div className="res-inline">

            <div className="res-item">
              <span className="res-label">⚡ electricity</span>
              <span className="res-val elec">
                {fmt(electricity)}
              </span>
            </div>

            <div className="res-item">
              <span className="res-label">🪨 extremium</span>
              <span className="res-val extr">
                {fmt(extremium)}
              </span>
            </div>

            <div className="res-item">
              <span className="res-label">⚔ army</span>
              <span className="res-val army">
                {army == null ? "—" : Math.floor(army)}
              </span>
            </div>

          </div>

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            logout
          </button>

        </div>
      </div>

      <div className="page">

        <div className="hero">

          <div className="hero-title">
            MY STARS
          </div>

        </div>

        <div className="section-title">
          — owned stars —
        </div>

        {msg && (
          <div className="msg-err">
            {msg}
          </div>
        )}

        {loading ? (

          <div className="loading">
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
          </div>

        ) : (

          <div className="list">

            {stars.map((s) => (

              <a
                key={String(s._id)}
                className="star-row"
                href="/star"
                onClick={() =>
                  localStorage.setItem(
                    "star_id",
                    String(s._id)
                  )
                }
              >

                <img
                  className="star-img"
                  src={getStarImage(s.temperature)}
                  alt="star"
                />

                <div className="star-info">

                  <div className="star-name">
                    {s.name || "Unknown Star"}
                  </div>

                  <div className="star-id">
                    #{String(s._id)}
                  </div>

                  {s.temperature != null && (
                    <div className="star-temp">
                      {s.temperature.toLocaleString()} K
                    </div>
                  )}

                </div>

                <div className="star-arrow">
                  →
                </div>

              </a>

            ))}

          </div>
        )}

      </div>
    </>
  );
}