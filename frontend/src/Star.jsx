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

precision mediump float;



#define PI 3.1415927

float Hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {

    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y,uv2=uv;
       
    vec3 col = vec3(0.0);

    float c = cos(iTime);
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


    //l=1.0-l;
   

      




    float t = iTime *0.5;

    l = pow(10.0, l) / 10.0;

    float x=uv2.x+(abs(cos(t+89.54)));


    vec4 colour = vec4(
        (1.0-x)*0.5,
        x*0.5,
        1.0,
        1.0
    );

    fragColor =
        vec4(col, 1.0)
        + l * colour;
}


void main() {

    mainImage(
        gl_FragColor,
        gl_FragCoord.xy
    );
}
`;

function compileShader(gl, type, source) {

  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);

  gl.compileShader(shader);

  return shader;
}

function ShaderBackground() {

  const canvasRef = useRef(null);

  useEffect(() => {

    const canvas = canvasRef.current;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
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

    const position = gl.getAttribLocation(
      program,
      "a_position"
    );

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

      gl.viewport(
        0,
        0,
        canvas.width,
        canvas.height
      );
    };

    resize();

    window.addEventListener("resize", resize);

    const start = performance.now();

    let raf;

    const render = () => {

      const time =
        (performance.now() - start) / 1000;

      gl.uniform2f(
        gl.getUniformLocation(program, "iResolution"),
        canvas.width,
        canvas.height
      );

      gl.uniform1f(
        gl.getUniformLocation(program, "iTime"),
        time
      );

      gl.clearColor(0, 0, 0, 1);

      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      raf = requestAnimationFrame(render);
    };

    render();

    return () => {

      cancelAnimationFrame(raf);

      window.removeEventListener(
        "resize",
        resize
      );
    };

  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
      }}
    />
  );
}



const CLIMATE_LABELS = {
  0: "arctic", 1: "temperate", 2: "tropical",
  3: "desert", 4: "volcanic", 5: "ocean",
};

function getPlanetImage(climate) {
  return "/res/planets/default.png";
}

// UV: 0-1 float → purple intensity
function uvColor(uv) {
  if (uv == null) return {};
  const t = Math.min(1, Math.max(0, uv));
  if (t < 0.33) return {};
  if (t < 0.66) return { color: "#c084fc", borderColor: "#7c3aed" };
  return { color: "#e879f9", borderColor: "#a21caf", fontWeight: "bold" };
}

// climate: 0-1 float → light blue intensity
function climateColor(climate) {
  if (climate == null) return {};
  const t = Math.min(1, Math.max(0, climate));
  if (t < 0.33) return {};
  if (t < 0.66) return { color: "#7dd3fc", borderColor: "#0284c7" };
  return { color: "#38bdf8", borderColor: "#0ea5e9", fontWeight: "bold" };
}

function StatBar({ label, value, max = 100 }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="stat">
      <div className="stat-header">
        <span className="stat-label">{label}</span>
        <span className="stat-val">{value}</span>
      </div>
      <div className="stat-track">
        <div className="stat-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function StarDetail() {
  const navigate = useNavigate();
  const [planets, setPlanets] = useState([]);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [electricity, setElectricity] = useState(null);
  const [extremium, setExtremium] = useState(null);
  const [army, setArmy] = useState(null);
  const [cooldown, setCooldown] = useState(null);
  const [actionMsg, setActionMsg] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const pollRef = useRef(null);

  const id = localStorage.getItem("star_id");
  const token = localStorage.getItem("token");
  const player_id = parseInt(localStorage.getItem("player_id"));

  const loadPlanets = async () => {
    const res = await fetch("/api/planets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, tok: token }),
    });
    if (res.ok) setPlanets(await res.json());
  };

  const loadResources = async () => {
    try {
      const res = await fetch("/api/ressources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    if (!token) { navigate("/login"); return; }
    if (!id)    { navigate("/myaccount"); return; }
    (async () => {
      try {
        await loadResources();
        await loadPlanets();
      } catch {
        setMsg("Server error");
      } finally {
        setLoading(false);
      }
    })();

    // poll resources every second
    pollRef.current = setInterval(loadResources, 1000);
    return () => clearInterval(pollRef.current);
  }, [id]);

  const doAction = async (planet_id, action) => {
    const key = `${planet_id}_${action}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    setActionMsg(prev => ({ ...prev, [key]: null }));
    try {
      const res = await fetch("/api/planet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: planet_id, tok: token, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMsg(prev => ({ ...prev, [key]: { ok: false, text: `Error ${res.status}` } }));
        return;
      }
      const [ret, newExtremium, newElectricity] = data;
      setExtremium(newExtremium);
      setElectricity(newElectricity);
      const success = action === "heal_planet" ? ret[0] !== 0 : ret[0] === 0;
      if (success) {
        let text_str="";
        switch(action){
            case "mine_upgrade":
                text_str="You have succesfully upgraded the level of the mine";
            break;

            case "gene_upgrade":
                text_str="You have succesfully upgraded the level of the generator";
            break;

            case "heal_planet":
                text_str="You have succesfully healed the planet";
            break;

            case "infra_upgrade":
                text_str="You have succesfully upgraded the level of the infrastructure";
            break;

            case "defense_upgrade":
                text_str="You have succesfully upgraded the level of the defense";
            break;
            default: 
                text_str="ERROR";
            break;
        }
        


        setActionMsg(prev => ({ ...prev, [key]: { ok: true, text: text_str ?? "done" } }));
        await loadPlanets();
      } else {
        setActionMsg(prev => ({ ...prev, [key]: { ok: false, text: ret[1] ?? "failed" } }));
      }
    } catch {
      setActionMsg(prev => ({ ...prev, [key]: { ok: false, text: "server error" } }));
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const doAttack = async (planet_id) => {
    const key = `${planet_id}_attack`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    setActionMsg(prev => ({ ...prev, [key]: null }));
    try {
      const res = await fetch("/api/planet_attack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planet_id: planet_id, tok: token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMsg(prev => ({ ...prev, [key]: { ok: false, text: `Error ${res.status}` } }));
        return;
      }
      const [code, msg] = data;
      setActionMsg(prev => ({ ...prev, [key]: { ok: code > 0, text: msg } }));
      await loadPlanets();
      await loadResources();
    } catch {
      setActionMsg(prev => ({ ...prev, [key]: { ok: false, text: "server error" } }));
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const ACTIONS = [
    { action: "infra_upgrade",   label: "↑ infra",     cls: "" },
    { action: "mine_upgrade",    label: "↑ mine",      cls: "" },
    { action: "gene_upgrade",    label: "↑ generator", cls: "" },
    { action: "defense_upgrade", label: "↑ defense",   cls: "def" },
    { action: "heal_planet",     label: "♥ heal",      cls: "heal" },
  ];

  const fmt = (n) => n == null ? "—" : Number(n).toFixed(2);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #03030f; }
        .page {
          min-height: 100vh;
          //background: radial-gradient(ellipse at 50% 0%, #0d0d2b 0%, #03030f 60%);
          font-family: 'Share Tech Mono', monospace;
          backdrop-filter: blur(8px);
          //color: #c8c8ff;
          padding: 32px 24px;
          padding-top: 100px;
          max-width: 680px;
          margin: 0 auto;
        }
        .topbar {
            border-radius: 10px; padding: 14px 16px;
          transition: border-color 0.15s;
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(3,3,15,0.42);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid #1a1a4a;
          padding: 12px 24px;
          max-width: 680px;
          margin: 0 auto;
          left: 50%; transform: translateX(-50%);
          width: 100%;
        }
        .logo {
          font-family: 'Orbitron', monospace;
          font-size: 0.9rem; font-weight: 700;
          letter-spacing: 0.2em; color: #7c6fff;
        }
        .topbar-right { display: flex; align-items: center; gap: 20px; }
        .res-inline { display: flex; gap: 16px; align-items: center; }
        .res-item { display: flex; flex-direction: column; gap: 1px; }
        .res-label { font-size: 0.52rem; letter-spacing: 0.15em; color: #5a5a9a; text-transform: uppercase; }
        .res-val { font-size: 0.78rem; }
        .res-val.elec { color: #7fd8ff; }
        .res-val.extr { color: #b5ff7f; }
        .res-val.army { color: #fca5a5; }
        .back-btn {
          background: transparent; border: 1px solid #2a2a6a;
          border-radius: 6px; color: #5a5a9a;
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.7rem; letter-spacing: 0.1em;
          padding: 6px 12px; cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
          text-decoration: none; display: inline-block; white-space: nowrap;
        }
        .back-btn:hover { border-color: #7c6fff; color: #c8c8ff; }
        .section-title {
          font-size: 0.68rem; letter-spacing: 0.25em;
          color: #5a5a9a; text-transform: uppercase; margin-bottom: 14px;
        }
        .list { display: flex; flex-direction: column; gap: 12px; }
        .planet-card {
          background: #0a0a1e7f; border: 1px solid #1a1a4a;
          border-radius: 10px; padding: 14px 16px;
          transition: border-color 0.15s;
        }
        .planet-card:hover { border-color: #3a3a8a; }
        .planet-top { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
        .planet-img {
          width: 52px; height: 52px; object-fit: contain; flex-shrink: 0;
          background: #1a1a4a; border-radius: 50%; border: 1px dashed #3a3a7a;
        }
        .planet-info { flex: 1; min-width: 0; }
        .planet-name {
          font-size: 0.85rem; color: #c8c8ff; letter-spacing: 0.08em; margin-bottom: 3px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .planet-id {
          font-size: 0.6rem; color: #3a3a7a; margin-bottom: 4px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .tags { display: flex; gap: 5px; flex-wrap: wrap; }
        .tag {
          font-size: 0.58rem; letter-spacing: 0.06em;
          padding: 2px 7px; border-radius: 99px;
          border: 1px solid #2a2a6a; color: #5a5a9a;
          transition: color 0.2s, border-color 0.2s;
        }
        .tag-owned { border-color: #2a5a2a; color: #5a9a5a; }
        .stats { display: flex; flex-direction: column; gap: 7px; }
        .stat-header {
          display: flex; justify-content: space-between;
          font-size: 0.6rem; color: #5a5a9a; margin-bottom: 3px;
        }
        .stat-label { letter-spacing: 0.08em; }
        .stat-val { color: #7a7aaa; }
        .stat-track { height: 3px; background: #1a1a3a; border-radius: 2px; overflow: hidden; }
        .stat-fill { height: 100%; background: #7c6fff; border-radius: 2px; transition: width 0.4s ease; }
        .divider { height: 1px; background: #1a1a3a; margin: 12px 0; }
        .card-bottom { display: flex; gap: 16px; align-items: flex-start; }
        .card-bottom .stats { flex: 1; }
        .actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; min-width: 110px; }
        .act-btn {
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.65rem; letter-spacing: 0.08em;
          padding: 6px 12px; border-radius: 6px;
          border: 1px solid #2a2a6a; background: transparent;
          color: #7c6fff; cursor: pointer;
          transition: border-color 0.15s, background 0.15s, opacity 0.15s;
          text-align: left;
        }
        .act-btn:hover:not(:disabled) { border-color: #7c6fff; background: #1a1a3a; }
        .act-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .act-btn.heal { color: #1d9e75; border-color: #1a4a38; }
        .act-btn.heal:hover:not(:disabled) { border-color: #1d9e75; background: #04342c; }
        .act-btn.def { color: #f59e0b; border-color: #78350f; }
        .act-btn.def:hover:not(:disabled) { border-color: #f59e0b; background: #1c0d00; }
        .act-btn.atk { color: #f87171; border-color: #7f1d1d; }
        .act-btn.atk:hover:not(:disabled) { border-color: #f87171; background: #2a0a0a; }
        .action-msg {
          margin-top: 8px; font-size: 0.65rem;
          padding: 5px 10px; border-radius: 5px;
        }
        .action-msg.ok  { color: #6ee7b7; background: #0d2a20; border: 1px solid #1a4a38; }
        .action-msg.err { color: #fca5a5; background: #2a0d0d; border: 1px solid #4a1a1a; }
        .loading { display: flex; gap: 6px; align-items: center; padding: 4rem 0; justify-content: center; }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: #7c6fff; animation: blink 1.2s ease-in-out infinite; }
        .dot:nth-child(2){animation-delay:.2s} .dot:nth-child(3){animation-delay:.4s}
        @keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}
        .empty { color: #3a3a7a; font-size: 0.8rem; padding: 3rem 0; text-align: center; }
        .msg-err {
          font-size: 0.78rem; padding: 10px 14px; border-radius: 6px; margin-bottom: 20px;
          color: #fca5a5; background: #2a0d0d; border: 1px solid #4a1a1a;
        }
      `}</style>
       
      {/* sticky topbar with resources */}
      <div className="topbar">
        <div className="logo">UniConqueror</div>
        <div className="topbar-right">
          <div className="res-inline">
            <div className="res-item">
              <span className="res-label">⚡ elec</span>
              <span className="res-val elec">{fmt(electricity)}</span>
            </div>
            <div className="res-item">
              <span className="res-label">🪨 extr</span>
              <span className="res-val extr">{fmt(extremium)}</span>
            </div>
            <div className="res-item">
              <span className="res-label">⚔ army</span>
              <span className="res-val army">{army == null ? "—" : Math.floor(army)}</span>
            </div>
            <div className="res-item">
              <span className="res-label">⏱ cooldown</span>
              <span className="res-val" style={{color: cooldown > Date.now() ? "#f87171" : "#5a9a5a"}}>
                {cooldown == null ? "—" : cooldown <= Date.now() ? "ready" : `${Math.ceil((cooldown - Date.now()) / 1000)}s`}
              </span>
            </div>
          </div>
          <a className="back-btn" href="/myaccount">← back</a>
        </div>
      </div>

      <div className="page">
        <div className="section-title">— planets in star #{id} —</div>

        {msg && <div className="msg-err">{msg}</div>}

        {loading ? (
          <div className="loading">
            <div className="dot" /><div className="dot" /><div className="dot" />
          </div>
        ) : planets.length === 0 && !msg ? (
          <div className="empty">no planets found</div>
        ) : (
          <div className="list">
            {planets.map((p) => {
              const pid = String(p._id);
              const isOwned = p.owner && p.owner !== 0;
              const myPlanet = p.owner === player_id;
              const uvStyle = uvColor(p.uv);
              const climStyle = climateColor(p.climate);

              return (
                <div className="planet-card" key={pid}>
                  <div className="planet-top">
                    <img
                      className="planet-img"
                      src={getPlanetImage(p.climate)}
                      alt={CLIMATE_LABELS[p.climate] ?? "planet"}
                      onError={e => { e.target.style.opacity = "0"; }}
                    />
                    <div className="planet-info">
                      <div className="planet-name">{p.name || "unknown"}</div>
                      <div className="planet-id">#{pid}</div>
                      <div className="tags">
                        {p.climate != null && (
                          <span className="tag" style={climStyle}>
                            {CLIMATE_LABELS[p.climate] ?? p.climate}
                          </span>
                        )}
                        {p.uv != null && (
                          <span className="tag" style={uvStyle}>
                            uv {Number(p.uv).toFixed(2)}
                          </span>
                        )}
                        <span className={`tag${isOwned ? " tag-owned" : ""}`}>
                          {isOwned ? "colonized" : "unclaimed"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="divider" />

                  <div className="card-bottom">
                    <div className="stats">
                      <StatBar label="hp"        value={p.hp        ?? 0} max={1000} />
                      <StatBar label="infra"     value={p.infra     ?? 0} max={100} />
                      <StatBar label="mine"      value={p.mine      ?? 0} max={100} />
                      <StatBar label="generator" value={p.generator ?? 0} max={100} />
                      <StatBar label="defense"   value={p.defense   ?? 0} max={100} />
                    </div>

                    {myPlanet && (
                      <div className="actions">
                        {ACTIONS.map(({ action, label, cls }) => {
                          const key = `${p._id}_${action}`;
                          const busy = actionLoading[key];
                          return (
                            <button
                              key={action}
                              className={`act-btn ${cls}`}
                              disabled={!!busy}
                              onClick={() => doAction(p._id, action)}
                            >
                              {busy ? "..." : label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {!myPlanet && (
                      <div className="actions">
                        <button
                          className="act-btn atk"
                          disabled={!!actionLoading[`${p._id}_attack`]}
                          onClick={() => doAttack(p._id)}
                        >
                          {actionLoading[`${p._id}_attack`] ? "..." : "⚔ attack"}
                        </button>
                      </div>
                    )}
                  </div>

                  {myPlanet && ACTIONS.map(({ action }) => {
                    const key = `${p._id}_${action}`;
                    const m = actionMsg[key];
                    return m ? (
                      <div key={key} className={`action-msg ${m.ok ? "ok" : "err"}`}>
                        {m.text}
                      </div>
                    ) : null;
                  })}
                  {!myPlanet && (() => {
                    const m = actionMsg[`${p._id}_attack`];
                    return m ? (
                      <div className={`action-msg ${m.ok ? "ok" : "err"}`}>{m.text}</div>
                    ) : null;
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ShaderBackground />
    </>
  );
}
