import { useState, useEffect, useRef } from "react";
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


    //l=l<0.2? l-1.0:1.0-l;
   

       l=1.0-l;




    float t = iTime * 2.0;

    l = pow(10.0, l) / 10.0;

    float x=uv2.x+abs(cos(iTime+89.54))*0.5;


    vec4 colour = vec4(
          1.0-x,
        x,
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
        zIndex: 0,
      }}
    />
  );
}

export default function RegisterForm() {

  const navigate = useNavigate();

  const [n, setN] = useState("");
  const [p, setP] = useState("");

  const [msg, setMsg] = useState(null);

  const [token, setToken] = useState(null);

  const [player_id, setPlayer_id] = useState(0);

  const handleSubmit = async () => {

    if (!n || !p) {

      setMsg({
        ok: false,
        text: "Please fill both fields."
      });

      return;
    }

    try {

      const res = await fetch(
        "/api/register",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({ n, p }),
        }
      );

      const data = await res.json();

      if (res.ok) {

        console.log(data);

        setToken(data[2]);

        setPlayer_id(data[1]);

        localStorage.setItem(
          "player_id",
          data[1]
        );

        localStorage.setItem(
          "token",
          data[2]
        );

        setMsg({
          ok: true,
          text:
            "Succesfuly logged in!"
        });

        navigate("/myaccount");

      } else {

        setMsg({
          ok: false,
          text:
            data.error || data[1]
        });
      }

    } catch {

      setMsg({
        ok: false,
        text: "Server Error"
      });
    }
  };

  return (
    <>
      <style>{`

        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Share+Tech+Mono&display=swap');

        *{
          box-sizing:border-box;
          margin:0;
          padding:0;
        }

        body{
          background:#000;
          overflow:hidden;
        }

        .overlay{

          position:fixed;
          inset:0;

          z-index:1;

          background:
            radial-gradient(
              circle at center,
              rgba(0,0,0,0.25),
              rgba(0,0,0,0.92)
            );
        }

        .grid{

          position:fixed;
          inset:0;

          z-index:1;

          opacity:0.18;

          pointer-events:none;

          background-image:
            linear-gradient(
              rgba(255,255,255,0.03) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255,255,255,0.03) 1px,
              transparent 1px
            );

          background-size:70px 70px;

          mask-image:
            radial-gradient(
              circle at center,
              black 35%,
              transparent 85%
            );
        }

        .wrap{

          position:relative;

          z-index:2;

          min-height:100vh;

          display:flex;

          align-items:center;
          justify-content:center;

          padding:24px;

          font-family:
            'Share Tech Mono',
            monospace;
        }

        .card{

          width:360px;

          background:
            linear-gradient(
              145deg,
              rgba(8,8,20,0.82),
              rgba(4,4,12,0.92)
            );

          border:
            1px solid rgba(120,80,255,0.12);

          border-radius:22px;

          padding:40px 34px;

          display:flex;
          flex-direction:column;
          gap:18px;

          backdrop-filter:blur(18px);

          box-shadow:
            0 0 80px rgba(120,80,255,0.08);
        }

        h1{

          font-family:'Orbitron',monospace;

          color:white;

          font-size:1.5rem;

          letter-spacing:.22em;

          text-align:center;

          text-shadow:
            0 0 18px rgba(120,80,255,0.55),
            0 0 45px rgba(120,80,255,0.2);
        }

        label{

          color:
            rgba(220,220,255,0.45);

          font-size:.7rem;

          letter-spacing:.18em;

          text-transform:uppercase;
        }

        input{

          width:100%;

          background:
            rgba(0,0,0,0.35);

          border:
            1px solid rgba(120,80,255,0.12);

          border-radius:12px;

          padding:14px 14px;

          color:#d7d7ff;

          font-family:inherit;

          font-size:.92rem;

          outline:none;

          margin-top:8px;

          transition:
            border-color .18s,
            box-shadow .18s;
        }

        input:focus{

          border-color:
            rgba(120,80,255,0.45);

          box-shadow:
            0 0 18px rgba(120,80,255,0.12);
        }

        button{

          margin-top:10px;

          padding:14px;

          background:
            linear-gradient(
              135deg,
              #5b21ff,
              #3d14b8
            );

          border:none;

          border-radius:14px;

          color:white;

          font-family:'Orbitron',monospace;

          font-size:.8rem;

          letter-spacing:.16em;

          cursor:pointer;

          transition:
            transform .18s,
            box-shadow .18s;

          box-shadow:
            0 0 30px rgba(91,33,255,0.25);
        }

        button:hover{

          transform:translateY(-2px);

          box-shadow:
            0 0 45px rgba(91,33,255,0.4);
        }

        .msg{

          font-size:.8rem;

          text-align:center;

          padding:10px;

          border-radius:12px;
        }

        .ok{

          color:#7fffc5;

          background:
            rgba(0,255,150,0.08);

          border:
            1px solid rgba(0,255,150,0.15);
        }

        .err{

          color:#ffb3b3;

          background:
            rgba(255,80,80,0.08);

          border:
            1px solid rgba(255,80,80,0.15);
        }

        .token{

          color:
            rgba(220,220,255,0.45);

          font-size:.72rem;

          word-break:break-all;
        }

      `}</style>

      <ShaderBackground />

      <div className="grid" />

      <div className="overlay" />

      <div className="wrap">

        <div className="card">

          <h1>REGISTER</h1>

          <div>

            <label>User Name</label>

            <input
              type="text"
              value={n}
              onChange={e =>
                setN(e.target.value)
              }
              placeholder="User Name"
            />

          </div>

          <div>

            <label>Password</label>

            <input
              type="password"
              value={p}
              onChange={e =>
                setP(e.target.value)
              }
              placeholder="••••••••"
            />

          </div>

          <button onClick={handleSubmit}>
            Register →
          </button>

          {msg && (
            <div
              className={
                `msg ${
                  msg.ok
                    ? "ok"
                    : "err"
                }`
              }
            >
              {msg.text}
            </div>
          )}

          {token && (
            <div className="token">
              Token: {token}
            </div>
          )}

        </div>

      </div>
    </>
  );
}